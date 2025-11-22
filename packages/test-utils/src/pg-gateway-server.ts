import type { Server } from "node:net";
import { createServer } from "node:net";
import type { PGlite } from "@electric-sql/pglite";
import { fromNodeSocket } from "pg-gateway/node";

// Simple logger interface for testing
type Logger = {
	debug: (msg: { msg: string; [key: string]: unknown }) => void;
	info: (msg: { msg: string; [key: string]: unknown }) => void;
	error: (msg: {
		msg: string;
		error?: unknown;
		[key: string]: unknown;
	}) => void;
};

// Define basic auth credential type
type PasswordCredentials = {
	username: string;
	password?: string;
};

export type PgGatewayServerConfig = {
	port: number;
	pgLite: PGlite;
	logger?: Logger;
	users: {
		username: string;
		password: string;
	}[];
};

export type PgGatewayServer = {
	server: Server;
	start: () => Promise<void>;
	stop: () => Promise<void>;
};

// Default console-based logger for tests
const defaultLogger: Logger = {
	// biome-ignore lint/suspicious/noEmptyBlockStatements: Silent logger for tests
	debug: () => {},
	// biome-ignore lint/suspicious/noEmptyBlockStatements: Silent logger for tests
	info: () => {},
	error: (msg) => console.error(msg.msg, msg.error),
};

/**
 * Creates a PG Gateway Server that connects to PGlite
 */
export function createPgGatewayServer(
	config: PgGatewayServerConfig
): PgGatewayServer {
	const { port, pgLite, users } = config;
	const logger = config.logger ?? defaultLogger;

	// Create the server
	const server = createServer((socket) => {
		// Handle the Promise with proper error handling
		(async () => {
			try {
				await fromNodeSocket(socket, {
					serverVersion: "16.3 (PGlite 0.2.0)",
					auth: {
						method: "password",
						getClearTextPassword(credentials: PasswordCredentials) {
							// Find matching user by username and return their password
							const foundUser = users.find(
								(u) => u.username === credentials.username
							);
							return foundUser?.password ?? "invalid-password";
						},
					},
					async onStartup() {
						// Wait for PGlite to be ready before further processing
						await pgLite.waitReady;
					},
					async onMessage(
						data: Uint8Array,
						{ isAuthenticated }: { isAuthenticated: boolean }
					) {
						// Only forward messages to PGlite after authentication
						if (!isAuthenticated) {
							return;
						}

						// Forward raw message to PGlite and send response to client
						try {
							return await pgLite.execProtocolRaw(data);
						} catch (err) {
							logger.error({
								msg: "Error processing PG message",
								error: err,
							});
							// Let the pg-gateway handle the error response
							throw err;
						}
					},
				});
			} catch (err) {
				logger.error({ msg: "Socket handler error", error: err });
				socket.destroy();
			}
		})();

		socket.on("end", () => {
			logger.debug({ msg: "Client disconnected" });
		});
	});

	return {
		server,

		// Start listening on the specified port
		start: () =>
			new Promise<void>((resolve) => {
				server.listen(port, () => {
					logger.debug({ msg: `PGlite server listening on port ${port}` });
					resolve();
				});
			}),

		// Stop the server
		stop: () =>
			new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) {
						logger.error({
							msg: "Error closing PGlite server",
							error: err,
						});
						reject(err);
					} else {
						logger.info({ msg: "PGlite server closed" });
						resolve();
					}
				});
			}),
	};
}
