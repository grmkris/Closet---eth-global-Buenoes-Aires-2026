import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createAuthHeaders } from "@ai-stilist/test-utils/test-helpers";
import {
	createTestSetup,
	type TestSetup,
} from "@ai-stilist/test-utils/test-setup";

describe("Example Test Suite", () => {
	let testEnv: TestSetup;

	beforeAll(async () => {
		testEnv = await createTestSetup();
	});

	afterAll(async () => {
		await testEnv.close();
	});

	test("should create test users with authentication", () => {
		expect(testEnv.users.authenticated.email).toBe("authenticated@test.com");
		expect(testEnv.users.unauthenticated.email).toBe(
			"unauthenticated@test.com"
		);
		expect(testEnv.users.authenticated.token).toBeTruthy();
		expect(testEnv.users.unauthenticated.token).toBeTruthy();
	});

	test("should create authenticated headers", () => {
		const headers = createAuthHeaders(testEnv.users.authenticated);
		const cookie = headers.get("cookie");

		expect(cookie).toContain("better-auth.session_token=");
		expect(cookie).toContain(testEnv.users.authenticated.token);
	});

	test("should query the database", async () => {
		const users = await testEnv.deps.db.query.user.findMany();

		expect(users).toHaveLength(2);
		expect(users.map((u: any) => u.email as string)).toContain(
			"authenticated@test.com"
		);
		expect(users.map((u: any) => u.email as string)).toContain(
			"unauthenticated@test.com"
		);
	});
});
