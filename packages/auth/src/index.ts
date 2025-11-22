// biome-ignore lint/performance/noNamespaceImport: Schema needs to be imported as namespace for drizzle
import * as schema from "@ai-stilist/db/schema/auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Creates a Better Auth instance with the given database
 * Factory pattern allows tests to use PGlite while production uses real Postgres
 *
 * Note: We use `any` for the db type because better-auth's drizzleAdapter
 * accepts any Drizzle database instance. The actual type safety is maintained
 * internally by drizzle-orm.
 */
// biome-ignore lint/suspicious/noExplicitAny: drizzleAdapter accepts any Drizzle database type
// biome-ignore lint/nursery/noShadow: Parameter name matches imported variable, but they're in different scopes
export function createAuth(db: any) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [process.env.CORS_ORIGIN || ""],
		emailAndPassword: {
			enabled: true,
		},
		advanced: {
			defaultCookieAttributes: {
				sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
			},
		},
	} satisfies BetterAuthOptions);
}

export type AuthClient = ReturnType<typeof createAuth>;

// Export convenience singleton for non-test usage
// Tests should call createAuth() directly with their own DB instance
import { db } from "@ai-stilist/db";
export const auth = createAuth(db);
