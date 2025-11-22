import type { Context } from "@ai-stilist/api/context";
import { NUMERIC_CONSTANTS } from "@ai-stilist/shared/constants";
import type { TestSetup, TestUser } from "./test.setup";

const SEVEN_DAYS_MS =
	NUMERIC_CONSTANTS.MAX_DELAY * 60 * 60 * 24 * NUMERIC_CONSTANTS.SEVEN_DAYS; // 7 days

/**
 * Creates an orpc context for authenticated user
 */
export function createAuthenticatedContext(testEnv: TestSetup): Context {
	return {
		session: {
			session: {
				id: crypto.randomUUID(),
				token: testEnv.users.authenticated.token,
				userId: testEnv.users.authenticated.id,
				expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
				createdAt: new Date(),
				updatedAt: new Date(),
				ipAddress: null,
				userAgent: null,
			},
			user: {
				id: testEnv.users.authenticated.id,
				email: testEnv.users.authenticated.email,
				name: "Test User",
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		},
	};
}

/**
 * Creates an orpc context without authentication
 */
export function createUnauthenticatedContext(): Context {
	return {
		session: null,
	};
}

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
	content: string | Buffer
): Promise<void> {
	// Using storage client upload method
	await deps.storage.upload({
		key,
		data: typeof content === "string" ? Buffer.from(content) : content,
	});
}
