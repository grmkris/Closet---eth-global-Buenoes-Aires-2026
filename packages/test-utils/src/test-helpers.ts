import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import type { Auth } from "better-auth";
import type { TestSetup, TestUser } from "./test-setup";

export type CreateContextOptions = {
	db: Database;
	logger: Logger;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	authClient: Auth;
	headers: Headers;
	requestId: RequestId;
};

export async function createContext({
	authClient,
	db,
	storage,
	queue,
	aiClient,
	logger,
	headers,
	requestId,
}: CreateContextOptions): Promise<{
	session: Awaited<ReturnType<typeof authClient.api.getSession>>;
	db: Database;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	logger: Logger;
	headers: Headers;
	requestId: RequestId;
}> {
	const session = await authClient.api.getSession({
		headers,
	});
	return {
		session,
		db,
		storage,
		queue,
		aiClient,
		logger,
		headers,
		requestId,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;

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
	deps: TestSetup["deps"],
	key: string,
	content: string | Buffer,
	contentType = "application/octet-stream"
): Promise<void> {
	// Using storage client upload method
	await deps.storage.upload({
		key,
		data: typeof content === "string" ? Buffer.from(content) : content,
		contentType,
	});
}

/**
 * Sleep helper for async tests
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true (polling helper)
 */
export async function waitFor(
	condition: () => Promise<boolean> | boolean,
	options: {
		timeout?: number;
		interval?: number;
		timeoutMessage?: string;
	} = {}
): Promise<void> {
	const {
		timeout = 5000,
		interval = 100,
		timeoutMessage = "Timeout waiting for condition",
	} = options;

	const start = Date.now();

	while (Date.now() - start < timeout) {
		if (await condition()) {
			return;
		}
		await sleep(interval);
	}

	throw new Error(timeoutMessage);
}
