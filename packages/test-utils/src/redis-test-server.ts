import { RedisMemoryServer } from "redis-memory-server";

/**
 * Configuration for the Redis memory server
 */
export type RedisTestConfig = {
	port?: number;
};

/**
 * Test Redis setup return type - explicitly defined for better type safety
 */
export type RedisTestSetup = {
	server: RedisMemoryServer;
	host: string;
	port: number;
	url: string;
	shutdown: () => Promise<void>;
};

/**
 * Creates an in-memory Redis server for testing
 * @param config Optional configuration for the Redis server
 * @returns Redis server instance with connection details
 */
export async function createTestRedisSetup(
	config: RedisTestConfig = {}
): Promise<RedisTestSetup> {
	const redisServer = new RedisMemoryServer({
		instance: {
			port: config.port,
		},
	});

	await redisServer.start();
	const host = await redisServer.getHost();
	const port = await redisServer.getPort();

	const shutdown = async () => {
		await redisServer.stop();
	};

	return {
		server: redisServer,
		host,
		port,
		url: `redis://${host}:${port}`,
		shutdown,
	};
}
