import { createContext } from "@ai-stilist/api/context";
import { appRouter } from "@ai-stilist/api/routers/index";
import { runMigrations } from "@ai-stilist/db";
import { HTTP_STATUS } from "@ai-stilist/shared/constants";
import { SERVICE_URLS } from "@ai-stilist/shared/services";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { Context, ErrorHandler } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { env } from "@/env";
import type { OrpcContextParams } from "@/lib/orpc";

const createAppOnErrorHandler =
	(deps: Pick<OrpcContextParams, "logger">): ErrorHandler =>
	(error: Error, c: Context) => {
		const logger = c.get("logger") ?? deps.logger;
		const requestId = c.get("requestId");
		logger.error({
			msg: "app.onError captured an error",
			path: c.req.path,
			url: c.req.url,
			requestId,
			error,
		});

		if (error instanceof HTTPException) {
			return c.json(
				{
					message: error.message,
					requestId,
				},
				error.status
			);
		}

		return c.json(
			{
				message: "Internal Server Error",
				requestId,
			},
			HTTP_STATUS.INTERNAL_SERVER_ERROR
		);
	};

export const createApp = async (props: {
	deps: Omit<OrpcContextParams, "requestId" | "headers">;
}) => {
	const { deps } = props;
	const { db, logger } = deps;

	logger.info("Creating app");

	try {
		await runMigrations(db, logger);
	} catch (error) {
		logger.error({ msg: "Migration failed", error });
		throw error;
	}

	// Initialize oRPC handler
	logger.info("Initializing oRPC handler");
	const orpcHandler = new RPCHandler(appRouter);
	const apiHandler = new OpenAPIHandler(appRouter, {
		plugins: [
			new OpenAPIReferencePlugin({
				schemaConverters: [new ZodToJsonSchemaConverter()],
			}),
		],
	});
	logger.info("oRPC handler initialized");

	const app = new Hono()
		.use(honoLogger())
		.get("/", (c) => c.text("OK"))
		.use(
			"/*",
			cors({
				origin: SERVICE_URLS[env.APP_ENV].web,
				allowMethods: ["GET", "POST", "OPTIONS"],
				allowHeaders: ["Content-Type", "Authorization"],
				credentials: true,
			})
		)
		.on(["POST", "GET"], "/api/auth/*", (c) =>
			deps.authClient.handler(c.req.raw)
		)
		.use("/rpc/*", async (c, next) => {
			const requestId = typeIdGenerator("request");
			const startTime = performance.now();

			// Extract procedure path from URL
			const url = new URL(c.req.url);
			const procedurePath = url.pathname.replace("/rpc/", "");
			const method = c.req.method;

			const orpcLogger = deps.logger.child({
				requestId,
				procedure: procedurePath,
			});

			const context = await createContext({
				db: deps.db,
				logger: orpcLogger,
				authClient: deps.authClient,
				storage: deps.storage,
				queue: deps.queue,
				aiClient: deps.aiClient,
				headers: c.req.raw.headers,
				requestId,
			});

			try {
				const { matched, response } = await orpcHandler.handle(c.req.raw, {
					prefix: "/rpc",
					context,
				});

				if (matched) {
					const duration = Math.round(performance.now() - startTime);

					// Log successful request
					orpcLogger.info({
						msg: `${procedurePath} ✓`,
						method,
						statusCode: response.status,
						duration,
					});

					return c.newResponse(response.body, response);
				}

				await next();
			} catch (error) {
				const duration = Math.round(performance.now() - startTime);

				// Log failed request
				orpcLogger.error({
					msg: `${procedurePath} ✗`,
					method,
					duration,
					error,
				});

				throw error;
			}
		})
		.use("/api-reference/*", async (c, next) => {
			const requestId = typeIdGenerator("request");

			const context = await createContext({
				db: deps.db,
				logger: deps.logger,
				authClient: deps.authClient,
				storage: deps.storage,
				queue: deps.queue,
				aiClient: deps.aiClient,
				headers: c.req.raw.headers,
				requestId,
			});

			const { matched, response } = await apiHandler.handle(c.req.raw, {
				prefix: "/api-reference",
				context,
			});

			if (matched) {
				return c.newResponse(response.body, response);
			}

			await next();
		})
		.onError(createAppOnErrorHandler(deps));

	return app;
};
