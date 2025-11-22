import type { Environment } from "@ai-stilist/shared/services";

/**
 * Default environment configuration for tests
 * Provides sensible defaults that can be overridden by actual env vars
 */
export const defaultTestEnv = {
	LOG_LEVEL: (process.env.LOG_LEVEL || "info") as
		| "debug"
		| "info"
		| "warn"
		| "error"
		| "fatal",
	APP_ENV: (process.env.APP_ENV || "dev") as Environment,
	BETTER_AUTH_SECRET:
		process.env.BETTER_AUTH_SECRET || "test-secret-key-for-testing-only",
	GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
	ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
	GROQ_API_KEY: process.env.GROQ_API_KEY || "",
	XAI_API_KEY: process.env.XAI_API_KEY || "",
} as const;
