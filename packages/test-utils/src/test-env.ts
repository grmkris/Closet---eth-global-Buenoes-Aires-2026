import { Environment } from "@ai-stilist/shared/services";
import { env as bunEnv } from "bun";
import { z } from "zod";

/**
 * Test environment schema
 * Uses Zod for validation and type safety, similar to apps/server/src/env.ts
 */
export const testEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("test"),
	APP_ENV: Environment.default("dev"),
	LOG_LEVEL: z
		.enum(["debug", "info", "warn", "error", "fatal"])
		.default("debug"),
	BETTER_AUTH_SECRET: z.string().default("test-secret-key-for-testing-only"),

	// AI Providers - all optional
	// When missing, returns undefined (not empty string)
	// Tests will fail fast with clear error if AI is needed without key
	GOOGLE_GEMINI_API_KEY: z.string().optional(),
	CDP_API_KEY_FILE: z.string(),
	FACILITATOR_PRIVATE_KEY: z.string(),
});

/**
 * Validated test environment
 * Set GOOGLE_GEMINI_API_KEY (or other provider keys) to run tests with real AI
 */
export const testEnv = testEnvSchema.parse(bunEnv);
