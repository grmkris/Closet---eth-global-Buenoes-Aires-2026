import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { S3Client as BunS3Client } from "bun";
import S3rver from "s3rver";

/**
 * Creates a temporary directory for S3rver to use
 */
const createTempDir = () => {
	const tmpDir = path.join(os.tmpdir(), `s3rver-test-${Date.now()}`);
	if (!fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir, { recursive: true });
	}
	return tmpDir;
};

/**
 * Generate a random port number between min and max
 */
const getRandomPort = (min = 10_000, max = 50_000) =>
	Math.floor(Math.random() * (max - min) + min);

/**
 * Test S3 setup return type - explicitly defined for better type safety
 */
export type S3TestSetup = {
	client: BunS3Client;
	bunClient: BunS3Client;
	s3rver: S3rver;
	server: AddressInfo;
	port: number;
	hostname: string;
	bucketName: string;
	shutdown: () => Promise<void>;
};

/**
 * Initializes an S3rver server and returns a Bun S3 client connected to it
 */
export async function createTestS3Setup(
	bucketName: string
): Promise<S3TestSetup> {
	// Set up the S3rver server
	const port = getRandomPort();
	const hostname = "localhost";
	const directory = createTempDir();

	// Create the S3rver instance with the bucket pre-configured
	const s3rver = new S3rver({
		port,
		directory,
		silent: true,
		configureBuckets: [{ name: bucketName, configs: [] }],
	});

	// Start the server
	const server = await s3rver.run();

	// Create a Bun S3 client configured for the S3rver endpoint & bucket
	const endpoint = `http://${hostname}:${port}`;
	const bunClient = new BunS3Client({
		accessKeyId: "S3RVER",
		secretAccessKey: "S3RVER",
		endpoint,
		bucket: bucketName,
	});

	// Create a method to shutdown the server
	const shutdown = async () => {
		await s3rver.close();
		fs.rmSync(directory, { recursive: true, force: true });
	};

	return {
		client: bunClient,
		bunClient,
		s3rver,
		server,
		port,
		hostname,
		bucketName,
		shutdown,
	};
}
