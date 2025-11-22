import type { TestSetup, TestUser } from "./test-setup";

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
