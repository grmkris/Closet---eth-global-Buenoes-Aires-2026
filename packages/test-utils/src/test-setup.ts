import type { AiClient } from "@ai-stilist/ai";
import { createAiClient } from "@ai-stilist/ai";
import { type Auth, createAuth } from "@ai-stilist/auth";
import { createDb, type Database, runMigrations } from "@ai-stilist/db";
import type { Logger as DrizzleLogger } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemCategoriesTable,
	clothingItemColorsTable,
	clothingItemsTable,
	clothingItemTagsTable,
} from "@ai-stilist/db/schema/wardrobe";
import { createLogger, type Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import { createQueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { createStorageClient } from "@ai-stilist/storage";
import type { User } from "better-auth";
import { env } from "bun";
import { z } from "zod";
import { createPgLite, type PGlite } from "./pg-lite";
import { createTestRedisSetup } from "./redis-test-server";
import { createTestS3Setup } from "./s3-test-server";
import { testEnv } from "./test-env";

/**
 * ORPC Context type for API tests
 * This must match the Context type from @ai-stilist/api/context
 */
export type Context = {
	session: Awaited<ReturnType<Auth["api"]["getSession"]>>;
	db: Database;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	logger: Logger;
	headers: Headers;
	requestId: RequestId;
};

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

const logger = createLogger({
	appName: "test.setup",
	level: "debug",
	environment: "dev",
});

const envSchema = z.object({
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal"]),
	BETTER_AUTH_SECRET: z.string(),
});
logger.info({ msg: "Validating environment", env });
const validatedEnv = envSchema.parse({
	LOG_LEVEL: "debug",
	BETTER_AUTH_SECRET: "test-secret-key-for-testing-only",
});

export type TestUser = {
	id: string;
	email: string;
	name: string;
	token: string; // session token for cookies
	user: User;
};

export type TestSetup = {
	deps: {
		db: Database;
		pgLite: PGlite;
		authClient: Auth;
		logger: Logger;
		storage: ReturnType<typeof createStorageClient>;
		redis: Awaited<ReturnType<typeof createTestRedisSetup>>;
		queue: ReturnType<typeof createQueueClient>;
		aiClient: ReturnType<typeof createAiClient>;
	};
	users: {
		authenticated: TestUser;
		unauthenticated: TestUser;
	};
	cleanup: () => Promise<void>;
	close: () => Promise<void>;
};

/**
 * Creates a test user with better-auth API
 */
async function createTestUser(
	authClient: Auth,
	email: string,
	name: string
): Promise<TestUser> {
	const password = "testtesttesttest";

	// Sign up
	const signUpResult = await authClient.api.signUpEmail({
		body: { email, name, password },
	});

	if (!signUpResult) {
		throw new Error(`Failed to sign up user ${email}`);
	}

	// Sign in to get session cookie
	const signInResponse = await authClient.api.signInEmail({
		body: { email, password },
		asResponse: true,
	});

	if (!signInResponse?.ok) {
		throw new Error(`Failed to sign in user ${email}`);
	}

	// Extract session cookie from headers
	const setCookieHeader = signInResponse.headers.get("set-cookie") || "";

	// Parse the session token from the cookie header
	const sessionTokenMatch = setCookieHeader.match(SessionTokenRegex);
	if (!sessionTokenMatch) {
		throw new Error(`Failed to extract session token for user ${email}`);
	}
	const sessionToken = sessionTokenMatch[1];
	if (!sessionToken) {
		throw new Error(`Failed to extract session token value for user ${email}`);
	}

	return {
		id: signUpResult.user.id,
		email,
		name,
		token: sessionToken,
		user: signUpResult.user,
	};
}

/**
 * Creates a complete test environment with in-memory database and all services
 */
export async function createTestSetup(): Promise<TestSetup> {
	// Create in-memory PGlite database
	const pgLite = createPgLite();

	// Only log SQL queries in debug mode to reduce test noise
	const drizzleLogger: DrizzleLogger = {
		logQuery: (query, params) => {
			if (validatedEnv.LOG_LEVEL === "debug") {
				logger.debug({ msg: "SQL Query", query, params });
			}
		},
	};

	// Create Drizzle instance
	const db = createDb({
		logger: drizzleLogger,
		dbData: {
			type: "pglite",
			db: pgLite,
		},
	});

	// Run migrations
	try {
		await runMigrations(db, logger);
		logger.info("Migrations applied successfully");
	} catch (error) {
		logger.error({ msg: "Migration failed", error });
		throw error;
	}

	// Create auth client
	const authClient = createAuth({
		db,
		appEnv: testEnv.APP_ENV,
		secret: testEnv.BETTER_AUTH_SECRET,
	});

	logger.info("Creating test users...");

	// Create test users using real auth API
	const authenticatedUser = await createTestUser(
		authClient,
		"authenticated@test.com",
		"Authenticated User"
	);

	const unauthenticatedUser = await createTestUser(
		authClient,
		"unauthenticated@test.com",
		"Unauthenticated User"
	);

	logger.info({
		msg: "Test users created",
		users: [authenticatedUser, unauthenticatedUser],
	});

	// Create S3 test server and storage client
	const s3Setup = await createTestS3Setup("test-s3-bucket");
	const storage = createStorageClient({
		s3Client: s3Setup.client,
		env: "dev",
		logger,
		endpoint: `http://${s3Setup.hostname}:${s3Setup.port}`,
	});

	logger.info({
		msg: "S3 test server created",
		s3Setup,
	});

	// Create Redis test server
	const redis = await createTestRedisSetup({ logger });

	logger.info({
		msg: "Test environment setup complete",
		users: 2,
		services: ["db", "auth", "storage", "redis"],
	});

	const queue = createQueueClient({
		url: redis.url,
		logger,
	});

	const aiClient = createAiClient({
		logger,
		providerConfigs: {
			googleGeminiApiKey: testEnv.GOOGLE_GEMINI_API_KEY,
		},
		environment: testEnv.APP_ENV,
	});

	// Cleanup function to reset data between tests
	const cleanup = async () => {
		logger.info("Cleaning up test data...");

		// Delete in order respecting foreign key constraints
		// Junction tables first, then analysis, then items
		await db.delete(clothingItemTagsTable);
		await db.delete(clothingItemColorsTable);
		await db.delete(clothingItemCategoriesTable);
		await db.delete(clothingAnalysesTable);
		await db.delete(clothingItemsTable);

		// Don't delete users, categories, colors, tags - they're shared across tests

		logger.info("Test data cleaned up");
	};

	// Close function to shut down all services
	const close = async () => {
		try {
			await s3Setup.shutdown();
			await redis.shutdown();
			await pgLite.close();
			logger.info("Test environment closed");
		} catch (error) {
			logger.error({ msg: "Error closing test environment", error });
		}
	};

	return {
		deps: {
			db,
			pgLite,
			authClient,
			logger,
			storage,
			redis,
			queue,
			aiClient,
		},
		users: {
			authenticated: authenticatedUser,
			unauthenticated: unauthenticatedUser,
		},
		cleanup,
		close,
	};
}

/**
 * Helper to create oRPC context for API tests
 * Pattern: pass auth token in headers, let auth client create session
 *
 * @param token - Optional session token for authenticated requests
 * @param testSetup - Test environment setup
 */
export async function createTestContext(props: {
	token?: string;
	testSetup: TestSetup;
}): Promise<Context> {
	const { token, testSetup } = props;
	const { deps } = testSetup;

	// Create headers with auth token if provided
	const headers = new Headers(
		token ? { cookie: `better-auth.session_token=${token}` } : {}
	);

	// Get session from auth client
	const session = await deps.authClient.api.getSession({
		headers,
	});

	// Build context object directly
	return {
		session,
		db: deps.db,
		storage: deps.storage,
		queue: deps.queue,
		aiClient: deps.aiClient,
		logger: deps.logger,
		headers,
		requestId: typeIdGenerator("request"),
	};
}
