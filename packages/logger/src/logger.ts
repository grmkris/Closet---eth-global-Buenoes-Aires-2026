import type { Environment } from "@ai-stilist/shared/services";
import type { LoggerOptions } from "pino";
import { pino } from "pino";

import pkg from "pino-std-serializers";

export type LoggerConfig = {
	level?: string;
	appName?: string;
	environment?: Environment;
};

/**
 * Create a Pino logger instance with the given configuration
 */
export function createLogger(config: LoggerConfig = {}) {
	const {
		level = "info",
		appName = "ai-stilist",
		environment = "development",
	} = config;

	// Base logger configuration
	const loggerOptions: LoggerOptions = {
		level,
		// Redact sensitive fields from logs
		redact: {
			paths: [
				"*.password",
				"*.token",
				"*.accessToken",
				"*.refreshToken",
				"*.secret",
				"*.apiKey",
				"*.authorization",
				"req.headers.authorization",
				"req.headers.cookie",
			],
			remove: true,
		},
		// Use errWithCause to preserve full error chains (e.g., API → DB → Blockchain)
		serializers: {
			err: pkg.errWithCause,
			error: pkg.errWithCause,
			req: pkg.wrapRequestSerializer,
			res: pkg.wrapResponseSerializer,
		},
		// Base context to include in all logs
		base: {
			app: appName,
		},
		// Timestamp function
		timestamp: pino.stdTimeFunctions.isoTime,
	};

	const logger =
		environment !== "prod"
			? pino({
					...loggerOptions,
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "HH:MM:ss Z",
							ignore: "pid,hostname,app,env",
							singleLine: true,
							messageFormat: "{msg}",
							sync: true,
						},
					},
				})
			: pino(loggerOptions);

	// Log initial startup message
	logger.info({
		msg: `Logger initialized in ${environment !== "prod" ? "development" : "production"} mode`,
	});

	return logger;
}

export type Logger = ReturnType<typeof createLogger>;
