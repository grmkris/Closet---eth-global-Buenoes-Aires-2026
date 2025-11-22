# Server Integration Guide

This guide shows how to integrate all the wardrobe/AI styling services into the server.

## Update `apps/server/src/server.ts`

Replace the entire file with the following:

```typescript
import "dotenv/config";
import { createAiClient } from "@ai-stilist/ai";
import { createContext } from "@ai-stilist/api/context";
import { appRouter } from "@ai-stilist/api/routers/index";
import { createAuth } from "@ai-stilist/auth";
import { createDb } from "@ai-stilist/db";
import { createLogger } from "@ai-stilist/logger";
import { createQueueClient } from "@ai-stilist/queue";
import { SERVICE_URLS } from "@ai-stilist/shared/services";
import { createStorageClient } from "@ai-stilist/storage";
import { createOutfitGenerator } from "@ai-stilist/wardrobe/outfit-generator";
import { createStylingRulesService } from "@ai-stilist/wardrobe/styling-rules";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import Redis from "ioredis";
import { env } from "@/env";
import { createImageProcessorWorker } from "@/workers/image-processor.worker";

// Create logger
const logger = createLogger({ level: "info" });

// Create database
const db = createDb({
	dbData: { type: "pg", databaseUrl: env.DATABASE_URL },
});

// Create auth client
const authClient = createAuth({
	db,
	appEnv: env.APP_ENV,
	secret: env.BETTER_AUTH_SECRET,
});

// Create Redis client
const redis = new Redis(SERVICE_URLS[env.APP_ENV].redis);

// Create S3/MinIO client
const s3Client = new Bun.S3({
	accessKeyId: env.MINIO_ACCESS_KEY,
	secretAccessKey: env.MINIO_SECRET_KEY,
	endpoint: SERVICE_URLS[env.APP_ENV].storage,
	bucket: env.MINIO_BUCKET_NAME,
});

// Create storage client
const storage = createStorageClient({
	s3Client,
	env: env.APP_ENV,
	logger,
});

// Create queue client
const queue = createQueueClient({ redis, logger });

// Create AI client
const aiClient = createAiClient({
	logger,
	providerConfigs: {
		googleGeminiApiKey: env.GOOGLE_GEMINI_API_KEY,
		anthropicApiKey: env.ANTHROPIC_API_KEY,
		groqApiKey: env.GROQ_API_KEY,
		xaiApiKey: env.XAI_API_KEY ?? "",
	},
	environment: env.APP_ENV,
});

// Create styling rules service
const stylingRulesService = createStylingRulesService(db);

// Create outfit generator
const outfitGenerator = createOutfitGenerator({
	db,
	aiClient,
	stylingRulesService,
	logger,
});

// Start background worker
logger.info({ msg: "Starting image processor worker" });
createImageProcessorWorker({
	queue,
	db,
	storage,
	aiClient,
	logger,
});

// Create Hono app
const app = new Hono();

app.use(honoLogger());
app.use(
	"/*",
	cors({
		origin: SERVICE_URLS[env.APP_ENV].web,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => authClient.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter);

app.use("/*", async (c, next) => {
	const context = await createContext({
		context: c,
		auth: authClient,
		db,
		storage,
		queue,
		aiClient,
		logger,
		outfitGenerator,
	});

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

app.get("/", (c) => c.text("OK"));

// Graceful shutdown
process.on("SIGTERM", async () => {
	logger.info({ msg: "SIGTERM received, shutting down gracefully" });
	await queue.close();
	await redis.quit();
	process.exit(0);
});

process.on("SIGINT", async () => {
	logger.info({ msg: "SIGINT received, shutting down gracefully" });
	await queue.close();
	await redis.quit();
	process.exit(0);
});

export default app;
```

## Install Dependencies

Run the following command to install all required dependencies:

```bash
bun install
```

This will install:
- `ioredis` - Redis client
- `bullmq` - Job queue
- All wardrobe package dependencies

## Environment Variables

Make sure your `apps/server/.env` file has the following (copy from .env.example):

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres

# MinIO / S3 (credentials only, URLs configured in SERVICE_URLS)
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=ai-stilist

# Auth
CORS_ORIGIN=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-here-change-in-production

# Application
NODE_ENV=development
PORT=8000
APP_ENV=dev

# AI Providers (at least one required for image analysis)
GOOGLE_GEMINI_API_KEY=your_actual_gemini_key_here
ANTHROPIC_API_KEY=
GROQ_API_KEY=
XAI_API_KEY=
```

**Important**: Replace `your_actual_gemini_key_here` with your real Gemini API key!

## Start Services

1. **Start Database**:
```bash
bun run db:start
```

2. **Start Redis** (if not using Docker):
```bash
redis-server
```

3. **Start MinIO** (if not already running):
The docker compose should already have MinIO set up. If not, you may need to add it.

4. **Start Server**:
```bash
bun run dev:server
```

## Test the Integration

Once everything is running, test the endpoints:

### 1. Health Check
```bash
curl http://localhost:3000/
# Should return: OK
```

### 2. Request Upload URL (requires auth)
```bash
curl -X POST http://localhost:3000/rpc/wardrobe.requestUpload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"contentType":"image/jpeg","extension":"jpg"}'
```

### 3. Check Queue Status
The background worker should be running and processing jobs automatically.

## Troubleshooting

### Redis Connection Error
- Make sure Redis is running: `redis-cli ping` should return `PONG`
- Check SERVICE_URLS.redis is correct for your environment

### MinIO Connection Error
- Verify MinIO is running: `curl http://localhost:9000/minio/health/live`
- Check credentials in .env match MinIO setup

### AI API Error
- Verify GOOGLE_GEMINI_API_KEY is set correctly
- Test API key: `curl -H "x-goog-api-key: YOUR_KEY" https://generativelanguage.googleapis.com/v1beta/models`

### Worker Not Processing Jobs
- Check logs for worker startup message
- Verify Redis connection is working
- Check queue status in logs

## Next Steps

1. ✅ Build frontend upload UI
2. ✅ Test full upload → process → metadata flow
3. ✅ Create seed styling rules
4. ✅ Test outfit generation
5. ✅ Add error handling and monitoring

Your AI stylist backend is now fully integrated and ready to process clothing images!
