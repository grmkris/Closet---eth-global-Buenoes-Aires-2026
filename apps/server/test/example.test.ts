import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestSetup, type TestSetup } from "./test.setup";
import { createAuthHeaders, getTestFile, uploadTestFile } from "./test-helpers";

describe("Example Test Suite", () => {
	let testEnv: TestSetup;

	beforeAll(async () => {
		testEnv = await createTestSetup();
	});

	afterAll(async () => {
		await testEnv.close();
	});

	test("should create test users with authentication", () => {
		expect(testEnv.users.user1.email).toBe("user1@test.com");
		expect(testEnv.users.user2.email).toBe("user2@test.com");
		expect(testEnv.users.user1.token).toBeTruthy();
		expect(testEnv.users.user2.token).toBeTruthy();
	});

	test("should create authenticated headers", () => {
		const headers = createAuthHeaders(testEnv.users.user1);
		const cookie = headers.get("cookie");

		expect(cookie).toContain("better-auth.session_token=");
		expect(cookie).toContain(testEnv.users.user1.token);
	});

	test("should upload and download files from S3", async () => {
		const testContent = "Hello, S3!";
		const key = "test-file.txt";

		// Upload file
		await uploadTestFile(testEnv.deps, key, testContent);

		// Download file
		const downloaded = await getTestFile(testEnv.deps, key);

		expect(downloaded.toString()).toBe(testContent);
	});

	test("should query the database", async () => {
		const users = await testEnv.deps.db.query.user.findMany();

		expect(users).toHaveLength(2);
		expect(users.map((u: any) => u.email as string)).toContain(
			"user1@test.com"
		);
		expect(users.map((u: any) => u.email as string)).toContain(
			"user2@test.com"
		);
	});
});
