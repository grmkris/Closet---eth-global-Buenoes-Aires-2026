import { beforeEach, describe, expect, test } from "bun:test";
import { typeIdGenerator, UserId } from "@ai-stilist/shared/typeid";
import {
	createTestContext,
	createTestSetup,
	type TestSetup,
} from "@ai-stilist/test-utils/test-setup";
import { call, ORPCError } from "@orpc/server";
import { aiRouter } from "./ai.router";

const TIMEOUT = 90_000;

describe("AI Router - CRUD Operations", () => {
	let testEnv: TestSetup;

	beforeEach(async () => {
		testEnv = await createTestSetup();
	});

	test(
		"create conversation and load it back",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			// Create a conversation by sending a chat message (auto-create)
			await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [
							{
								type: "text",
								text: "Hello",
							},
						],
					},
					// No conversationId - let it auto-create
				},
				{ context }
			);

			// Find the auto-created conversation in database
			const conversations =
				await testEnv.deps.db.query.aiConversationsTable.findMany({
					where: (table, { eq }) =>
						eq(table.userId, UserId.parse(testEnv.users.authenticated.id)),
				});
			expect(conversations.length).toBeGreaterThanOrEqual(1);

			const conversationId = conversations[0]?.id;
			if (!conversationId) {
				throw new Error("Conversation ID not found");
			}

			// Load the conversation back
			const loaded = await call(
				aiRouter.loadConversation,
				{ conversationId },
				{ context }
			);

			expect(loaded).toBeDefined();
			expect(loaded.conversation).toBeDefined();
			expect(loaded.conversation.id).toBe(conversationId);
			expect(loaded.messages).toBeDefined();
			expect(loaded.messages.length).toBeGreaterThanOrEqual(1); // at least user message (AI might fail in tests)

			// Verify in database
			const dbConversation =
				await testEnv.deps.db.query.aiConversationsTable.findFirst({
					where: (table, { eq }) => eq(table.id, conversationId),
				});
			expect(dbConversation).toBeDefined();
			expect(dbConversation?.id).toBe(conversationId);

			// Verify user message exists
			const userMessage = loaded.messages.find((m) => m.role === "user");
			expect(userMessage).toBeDefined();
		},
		TIMEOUT
	);

	test(
		"list conversations",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			// Initially empty
			const emptyList = await call(
				aiRouter.listConversations,
				{ page: 1, limit: 10 },
				{ context }
			);
			expect(emptyList.conversations).toHaveLength(0);

			// Create some conversations (auto-create)
			await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "First conversation" }],
					},
					// No conversationId - auto-create
				},
				{ context }
			);

			await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "Second conversation" }],
					},
					// No conversationId - auto-create
				},
				{ context }
			);

			// List conversations
			const list = await call(
				aiRouter.listConversations,
				{ page: 1, limit: 10 },
				{ context }
			);

			expect(list.conversations.length).toBeGreaterThanOrEqual(2);
			expect(list.pagination).toBeDefined();
			expect(list.pagination.page).toBe(1);
			expect(list.pagination.limit).toBe(10);

			// Verify conversations are in DB
			const dbConversations =
				await testEnv.deps.db.query.aiConversationsTable.findMany({
					where: (table, { eq }) =>
						eq(table.userId, UserId.parse(testEnv.users.authenticated.id)),
				});
			expect(dbConversations.length).toBeGreaterThanOrEqual(2);
		},
		TIMEOUT
	);

	test(
		"delete conversation",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			// Create a conversation (auto-create)
			await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "To be deleted" }],
					},
					// No conversationId - auto-create
				},
				{ context }
			);

			// Find the auto-created conversation in database
			const conversations =
				await testEnv.deps.db.query.aiConversationsTable.findMany({
					where: (table, { eq }) =>
						eq(table.userId, UserId.parse(testEnv.users.authenticated.id)),
				});
			expect(conversations.length).toBeGreaterThanOrEqual(1);

			const conversationId = conversations[0]?.id;
			if (!conversationId) {
				throw new Error("Conversation ID not found");
			}

			// Verify it exists in DB
			const beforeDelete =
				await testEnv.deps.db.query.aiConversationsTable.findFirst({
					where: (table, { eq }) => eq(table.id, conversationId),
				});
			expect(beforeDelete).toBeDefined();

			// Delete it
			const result = await call(
				aiRouter.deleteConversation,
				{ conversationId },
				{ context }
			);
			expect(result.success).toBe(true);

			// Verify it's deleted from DB
			const afterDelete =
				await testEnv.deps.db.query.aiConversationsTable.findFirst({
					where: (table, { eq }) => eq(table.id, conversationId),
				});
			expect(afterDelete).toBeUndefined();

			// Verify messages are also deleted (cascade)
			const messages = await testEnv.deps.db.query.aiMessagesTable.findMany({
				where: (table, { eq }) => eq(table.conversationId, conversationId),
			});
			expect(messages).toHaveLength(0);
		},
		TIMEOUT
	);

	test(
		"load non-existent conversation returns NOT_FOUND error",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			const nonExistentId = typeIdGenerator("conversation");

			try {
				await call(
					aiRouter.loadConversation,
					{ conversationId: nonExistentId },
					{ context }
				);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ORPCError);
				expect((error as ORPCError<"NOT_FOUND", unknown>).code).toBe(
					"NOT_FOUND"
				);
			}
		},
		TIMEOUT
	);

	test(
		"user isolation - user A cannot access user B conversations",
		async () => {
			// Create conversation for user A (auto-create)
			const contextUserA = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "User A conversation" }],
					},
					// No conversationId - auto-create
				},
				{ context: contextUserA }
			);

			// Find the auto-created conversation in database
			const conversations =
				await testEnv.deps.db.query.aiConversationsTable.findMany({
					where: (table, { eq }) =>
						eq(table.userId, UserId.parse(testEnv.users.authenticated.id)),
				});
			expect(conversations.length).toBeGreaterThanOrEqual(1);

			const conversationId = conversations[0]?.id;
			if (!conversationId) {
				throw new Error("Conversation ID not found");
			}

			// Try to access from user B (unauthenticated user in our setup)
			const contextUserB = await createTestContext({
				token: testEnv.users.unauthenticated.token,
				testSetup: testEnv,
			});

			try {
				await call(
					aiRouter.loadConversation,
					{ conversationId },
					{ context: contextUserB }
				);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ORPCError);
				expect((error as ORPCError<"NOT_FOUND", unknown>).code).toBe(
					"NOT_FOUND"
				);
			}

			// Verify user B can't see it in their list
			const userBList = await call(
				aiRouter.listConversations,
				{ page: 1, limit: 10 },
				{ context: contextUserB }
			);
			const userBHasConversation = userBList.conversations.some(
				(c) => c.id === conversationId
			);
			expect(userBHasConversation).toBe(false);
		},
		TIMEOUT
	);
});
