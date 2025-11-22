import { SERVER_CONFIG } from "@ai-stilist/shared/constants";
import { Environment } from "@ai-stilist/shared/services";
import { env as bunEnv } from "bun";
import { z } from "zod";
export const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	APP_ENV: Environment.default("dev"),
	PORT: z.coerce.number().default(SERVER_CONFIG.DEFAULT_PORT),
	DATABASE_URL: z.string(),
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.string().url(),
	CORS_ORIGIN: z.string().url(),
	LOG_LEVEL: z
		.enum(["debug", "info", "warn", "error", "fatal"])
		.default("info"),

	// MinIO / S3 (credentials only, URLs come from SERVICE_URLS)
	// Optional in test environment (uses mock S3)
	MINIO_ACCESS_KEY: z.string().optional(),
	MINIO_SECRET_KEY: z.string().optional(),
	MINIO_BUCKET_NAME: z.string().optional(),

	// AI Providers
	GOOGLE_GEMINI_API_KEY: z.string().optional(),
	ANTHROPIC_API_KEY: z.string().optional(),
	GROQ_API_KEY: z.string().optional(),
	XAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(bunEnv);
