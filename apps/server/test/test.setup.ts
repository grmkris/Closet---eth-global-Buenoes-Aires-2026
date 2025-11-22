import { createAiClient } from "@ai-stilist/ai";
import { type Auth, createAuth } from "@ai-stilist/auth";
import { createDb, type Database, runMigrations } from "@ai-stilist/db";
import type { Logger as DrizzleLogger } from "@ai-stilist/db/drizzle";
import {
	createLogger,
	type Logger,
	type LoggerConfig,
} from "@ai-stilist/logger";
import { createQueueClient } from "@ai-stilist/queue";
import type { Environment } from "@ai-stilist/shared/services";
import { createStorageClient } from "@ai-stilist/storage";
import { createPgLite, type PGlite } from "@ai-stilist/test-utils/pg-lite";
import { createTestRedisSetup } from "@ai-stilist/test-utils/redis-test-server";
import { createTestS3Setup } from "@ai-stilist/test-utils/s3-test-server";
import type { User } from "better-auth";
import { env } from "@/env";

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

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
	// Create logger
	const testLogLevel =
		(process.env.TEST_LOG_LEVEL as LoggerConfig["level"]) ?? "error";
	const logger = createLogger({
		appName: "test.setup",
		level: testLogLevel,
		nodeEnv: "test",
	});

	// Create in-memory PGlite database
	const pgLite = createPgLite();

	// Only log SQL queries in debug mode to reduce test noise
	const drizzleLogger: DrizzleLogger = {
		logQuery: (query, params) => {
			if (testLogLevel === "debug" || testLogLevel === "trace") {
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
		logger.debug("Migrations applied successfully");
	} catch (error) {
		logger.error({ msg: "Migration failed", error });
		throw error;
	}

	// Create auth client
	const authClient = createAuth({
		db,
		appEnv: env.APP_ENV,
		secret: env.BETTER_AUTH_SECRET,
	});

	logger.debug("Creating test users...");

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

	// Create S3 test server and storage client
	const s3Setup = await createTestS3Setup("test-s3-bucket");
	const storage = createStorageClient({
		s3Client: s3Setup.client,
		env: (process.env.APP_ENV as Environment) || "dev",
		logger,
	});

	// Create Redis test server
	const redis = await createTestRedisSetup();

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
			googleGeminiApiKey: env.GEMINI_API_KEY,
			anthropicApiKey: env.ANTHROPIC_API_KEY,
			groqApiKey: env.GROQ_API_KEY,
			xaiApiKey: env.XAI_API_KEY,
		},
		environment: env.APP_ENV,
	});

	// Cleanup function to reset data between tests
	const cleanup = async () => {
		// No-op for now - implement database truncation/cleanup if needed
		await Promise.resolve();

		logger.debug("Test data cleaned up");
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
