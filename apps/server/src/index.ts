import { createAiClient } from "@ai-stilist/ai";
import { createAuth } from "@ai-stilist/auth";
import { createDb } from "@ai-stilist/db";
import { createLogger } from "@ai-stilist/logger";
import { createQueueClient } from "@ai-stilist/queue";
import { createRedisClient } from "@ai-stilist/redis";
import { SERVER_CONFIG } from "@ai-stilist/shared/constants";
import { SERVICE_URLS } from "@ai-stilist/shared/services";
import { createStorageClient } from "@ai-stilist/storage";
import { S3Client } from "bun";
import { createApp } from "@/app";
import { env } from "@/env";
import { createImageProcessorWorker } from "@/workers/image-processor.worker";

const logger = createLogger({
	level: "info",
});

const db = createDb({
	dbData: { type: "pg", databaseUrl: env.DATABASE_URL },
});

const authClient = createAuth({
	db,
	appEnv: env.APP_ENV,
	secret: env.BETTER_AUTH_SECRET,
});

const redis = createRedisClient({
	url: SERVICE_URLS[env.APP_ENV].redis,
});

const s3Client = new S3Client({
	accessKeyId: env.MINIO_ACCESS_KEY,
	secretAccessKey: env.MINIO_SECRET_KEY,
	endpoint: SERVICE_URLS[env.APP_ENV].storage,
	bucket: env.MINIO_BUCKET_NAME,
});

const storage = createStorageClient({
	s3Client,
	env: env.APP_ENV,
	logger,
});

const queue = createQueueClient({
	url: SERVICE_URLS[env.APP_ENV].redis,
	logger,
});

const aiClient = createAiClient({
	logger,
	providerConfigs: {
		googleGeminiApiKey: env.GOOGLE_GOOGLE_GEMINI_API_KEY,
		anthropicApiKey: env.ANTHROPIC_API_KEY,
		groqApiKey: env.GROQ_API_KEY,
		xaiApiKey: env.XAI_API_KEY ?? "",
	},
	environment: env.APP_ENV,
});

// Start background worker
logger.info({ msg: "Starting image processor worker" });
let worker: ReturnType<typeof createImageProcessorWorker>;
try {
	worker = createImageProcessorWorker({
		queue,
		db,
		storage,
		aiClient,
		logger,
	});
	logger.info({ msg: "Image processor worker started successfully" });
} catch (error) {
	logger.error({ msg: "Failed to start worker", error });
	throw error;
}

const app = await createApp({
	deps: {
		db,
		logger,
		authClient,
		storage,
		queue,
		aiClient,
	},
});

export default {
	port: env.PORT,
	fetch: app.fetch,
	idleTimeout: SERVER_CONFIG.IDLE_TIMEOUT_SECONDS,
};

process.on("SIGTERM", async () => {
	logger.info({ msg: "SIGTERM received, shutting down gracefully" });
	await worker.close();
	await queue.close();
	redis.close();
	process.exit(0);
});

process.on("SIGINT", async () => {
	logger.info({ msg: "SIGINT received, shutting down gracefully" });
	await worker.close();
	await queue.close();
	redis.close();
	process.exit(0);
});
