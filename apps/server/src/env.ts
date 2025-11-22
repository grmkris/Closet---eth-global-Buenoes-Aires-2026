import { Environment } from "@ai-stilist/shared/services";
import { z } from "zod";

export const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	APP_ENV: Environment,
	PORT: z.coerce.number().default(8000),
	DATABASE_URL: z.string(),
	BETTER_AUTH_SECRET: z.string(),

	// MinIO / S3 (credentials only, URLs come from SERVICE_URLS)
	MINIO_ACCESS_KEY: z.string(),
	MINIO_SECRET_KEY: z.string(),
	MINIO_BUCKET_NAME: z.string(),

	// AI Providers
	GEMINI_API_KEY: z.string().optional(),
	ANTHROPIC_API_KEY: z.string().optional(),
	GROQ_API_KEY: z.string().optional(),
	XAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(Bun.env);
