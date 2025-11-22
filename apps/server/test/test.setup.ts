import { type AuthClient, createAuth } from "@ai-stilist/auth";
// biome-ignore lint/performance/noNamespaceImport: Schema needs to be imported as namespace for drizzle
import * as schema from "@ai-stilist/db/schema/auth";
import { createTestS3Setup } from "@ai-stilist/test-utils";
import { createPgLite, type PGlite } from "@ai-stilist/test-utils/pg-lite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

// Simple types for test data
export type TestUser = {
	id: string;
	email: string;
	name: string;
	password: string;
	token: string; // session token for auth
};

export type TestDeps = {
	pgLite: PGlite;
	// biome-ignore lint/suspicious/noExplicitAny: PGlite drizzle type inference issue, type safety maintained by drizzle internally
	db: any; // TODO: Fix drizzle type inference for PGlite
	auth: AuthClient;
	s3: Awaited<ReturnType<typeof createTestS3Setup>>;
};

export type TestSetup = {
	deps: TestDeps;
	users: {
		user1: TestUser;
		user2: TestUser;
	};
	cleanup: () => Promise<void>;
	close: () => Promise<void>;
};

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

/**
 * Creates a test user and returns their session token
 */
async function createTestUser(
	auth: AuthClient,
	email: string,
	name: string
): Promise<TestUser> {
	const password = "test1234";

	// Sign up
	const signUpResult = await auth.api.signUpEmail({
		body: { email, name, password },
	});

	if (!signUpResult) {
		throw new Error(`Failed to sign up user ${email}`);
	}

	// Sign in to get session token
	const signInResponse = await auth.api.signInEmail({
		body: { email, password },
		asResponse: true,
	});

	if (!signInResponse?.ok) {
		throw new Error(`Failed to sign in user ${email}`);
	}

	// Extract session token from Set-Cookie header
	const setCookieHeader = signInResponse.headers.get("set-cookie") || "";
	const sessionTokenMatch = setCookieHeader.match(SessionTokenRegex);

	if (!sessionTokenMatch?.[1]) {
		throw new Error(`Failed to extract session token for user ${email}`);
	}

	return {
		id: signUpResult.user.id,
		email,
		name,
		password,
		token: sessionTokenMatch[1],
	};
}

/**
 * Creates a complete test environment with database, auth, and mocked services
 */
export async function createTestSetup(): Promise<TestSetup> {
	// Create in-memory PGlite database
	const pgLite = createPgLite();
	await pgLite.waitReady;

	// Create Drizzle instance with schema for full type inference
	const db = drizzle(pgLite, { schema });

	// Create database schema
	// Since PGlite doesn't have migrations yet, we'll create the schema directly
	await pgLite.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "email_verified" boolean NOT NULL,
      "image" text,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY,
      "expires_at" timestamp NOT NULL,
      "token" text NOT NULL UNIQUE,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "access_token_expires_at" timestamp,
      "refresh_token_expires_at" timestamp,
      "scope" text,
      "password" text,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp,
      "updated_at" timestamp
    );
  `);

	// Create auth instance using factory pattern
	const auth = createAuth(db);

	// Create test users
	const user1 = await createTestUser(auth, "user1@test.com", "Test User 1");
	const user2 = await createTestUser(auth, "user2@test.com", "Test User 2");

	// Set up S3 mock
	const s3 = await createTestS3Setup("test-bucket");

	// Optional: Set up Redis mock (uncomment if needed)
	// const redis = await createTestRedisSetup();

	const cleanup = async () => {
		// Use TRUNCATE CASCADE for faster, cleaner reset
		await db.execute(sql`
			TRUNCATE TABLE "session", "account", "verification", "user"
			RESTART IDENTITY CASCADE
		`);
	};

	const close = async () => {
		// Shutdown S3 mock
		await s3.shutdown();

		// Optional: Shutdown Redis mock
		// if (redis) await redis.shutdown();

		// Close PGlite
		await pgLite.close();
	};

	return {
		deps: {
			pgLite,
			db,
			auth,
			s3,
			// redis,
		},
		users: {
			user1,
			user2,
		},
		cleanup,
		close,
	};
}
