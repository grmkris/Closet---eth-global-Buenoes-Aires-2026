import type { TestDeps, TestUser } from "./test.setup";

/**
 * Creates authenticated headers with a session token
 */
export function createAuthHeaders(user: TestUser): Headers {
	return new Headers({
		cookie: `better-auth.session_token=${user.token}`,
	});
}

/**
 * Creates a mock request with authenticated headers
 */
export function createAuthRequest(
	url: string,
	user: TestUser,
	init?: RequestInit
): Request {
	const headers = createAuthHeaders(user);

	if (init?.headers) {
		const initHeaders = new Headers(init.headers);
		for (const [key, value] of initHeaders.entries()) {
			headers.set(key, value);
		}
	}

	return new Request(url, {
		...init,
		headers,
	});
}

/**
 * Uploads a test file to S3
 */
export async function uploadTestFile(
	deps: TestDeps,
	key: string,
	content: string | Buffer
): Promise<void> {
	await deps.s3.minioClient.putObject(
		deps.s3.bucketName,
		key,
		typeof content === "string" ? Buffer.from(content) : content
	);
}

/**
 * Gets a file from S3
 */
export async function getTestFile(
	deps: TestDeps,
	key: string
): Promise<Buffer> {
	const stream = await deps.s3.minioClient.getObject(deps.s3.bucketName, key);

	const chunks: Buffer[] = [];
	return new Promise((resolve, reject) => {
		stream.on("data", (chunk: Buffer | string) => {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			chunks.push(buffer);
		});
		stream.on("end", () => resolve(Buffer.concat(chunks)));
		stream.on("error", reject);
	});
}

/**
 * Deletes a file from S3
 */
export async function deleteTestFile(
	deps: TestDeps,
	key: string
): Promise<void> {
	await deps.s3.minioClient.removeObject(deps.s3.bucketName, key);
}

/**
 * Lists all objects in the test S3 bucket
 */
export function listTestFiles(deps: TestDeps): Promise<string[]> {
	const stream = deps.s3.minioClient.listObjects(deps.s3.bucketName, "", true);

	const objects: string[] = [];
	return new Promise((resolve, reject) => {
		stream.on("data", (obj: { name: string }) => objects.push(obj.name));
		stream.on("end", () => resolve(objects));
		stream.on("error", reject);
	});
}
