import type { Database } from "@ai-stilist/db";
import { DB_SCHEMA } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import { type Environment, SERVICE_URLS } from "@ai-stilist/shared/services";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { siwe } from "better-auth/plugins";
import { generateNonce } from "siwe";
import { verifyMessage } from "viem";

export type AuthConfig = {
	db: Database;
	appEnv: Environment;
	secret: string;
	baseURL?: string;
	trustedOrigins?: string[];
	logger: Logger;
};

export const createAuth = (config: AuthConfig) => {
	const { logger } = config;
	const baseURL = config.baseURL ?? SERVICE_URLS[config.appEnv].auth;
	const trustedOrigins = config.trustedOrigins ?? [
		SERVICE_URLS[config.appEnv].web,
	];

	const authDomain = new URL(baseURL).hostname;

	return betterAuth<BetterAuthOptions>({
		database: drizzleAdapter(config.db, {
			provider: "pg",
			schema: DB_SCHEMA,
		}),
		secret: config.secret,
		baseURL,
		trustedOrigins,
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			siwe({
				domain: authDomain,
				emailDomainName: authDomain,
				anonymous: true,

				getNonce: () => Promise.resolve(generateNonce()),

				verifyMessage: async ({ message, signature, address }) => {
					try {
						const isValid = await verifyMessage({
							address: address as `0x${string}`,
							message,
							signature: signature as `0x${string}`,
						});
						return isValid;
					} catch (error) {
						logger.error({ msg: "SIWE verification failed", error });
						return false;
					}
				},
			}),
		],
		advanced: {
			database: {
				generateId: false,
			},
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
			crossSubDomainCookies: {
				enabled: true,
				domain: SERVICE_URLS[config.appEnv].cookieDomain,
			},
		},
	});
};

export type Auth = ReturnType<typeof createAuth>;
