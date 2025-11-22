// biome-ignore lint/performance/noNamespaceImport: Schema needs to be imported as namespace for drizzle
import * as schema from "@ai-stilist/db/schema/auth";
import type { Database } from "@ai-stilist/db";
import type { Environment } from "@ai-stilist/shared";
import { SERVICE_URLS } from "@ai-stilist/shared";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Creates a Better Auth instance with the given database
 * Factory pattern allows tests to use PGlite while production uses real Postgres
 */
export function createAuth(config: {
	db: Database;
	appEnv: Environment;
	secret: string;
}) {
	const { db, appEnv, secret } = config;
	const isDevelopment = appEnv === "dev";

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		secret,
		trustedOrigins: [SERVICE_URLS[appEnv].web],
		emailAndPassword: {
			enabled: true,
		},
		advanced: {
			defaultCookieAttributes: {
				sameSite: isDevelopment ? "lax" : "none",
				secure: !isDevelopment,
				httpOnly: true,
			},
		},
	} satisfies BetterAuthOptions);
}

export type Auth = ReturnType<typeof createAuth>;
