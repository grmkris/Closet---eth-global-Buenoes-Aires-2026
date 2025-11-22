import "dotenv/config";
import { createContext } from "@ai-stilist/api/context";
import { appRouter } from "@ai-stilist/api/routers/index";
import { createAuth } from "@ai-stilist/auth";
import { createDb } from "@ai-stilist/db";
import { SERVICE_URLS } from "@ai-stilist/shared";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@/env";

// Create db and auth instances
const db = createDb({ databaseUrl: env.DATABASE_URL });
const authClient = createAuth({
	db,
	appEnv: env.APP_ENV,
	secret: env.BETTER_AUTH_SECRET,
});

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: SERVICE_URLS[env.APP_ENV].web,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => authClient.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			// biome-ignore lint/suspicious/noConsole: Error logging needed for debugging production issues
			console.error(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			// biome-ignore lint/suspicious/noConsole: Error logging needed for debugging production issues
			console.error(error);
		}),
	],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c, auth: authClient });

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

export default app;
