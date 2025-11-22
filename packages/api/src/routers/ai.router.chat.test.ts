import { beforeEach, describe, expect, test } from "bun:test";
import { call, eventIteratorToStream } from "@orpc/server";
import { readUIMessageStream } from "@ai-stilist/ai";
import { typeIdGenerator, UserId } from "@ai-stilist/shared/typeid";
import { createTestContext, createTestSetup, type TestSetup } from "@ai-stilist/test-utils/test-setup";
import { aiRouter } from "./ai.router";
import type { MyUIMessage } from "../features/ai/message-type";

const TIMEOUT = 90_000;

describe("AI Router - Chat Interactions", () => {
	let testEnv: TestSetup;

	beforeEach(async () => {
		testEnv = await createTestSetup();
	});

	test(
		"send hello world and receive response",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			const conversationId = typeIdGenerator("conversation");
			const messageId = typeIdGenerator("message");

			// Send hello world
			const result = await call(
				aiRouter.chat,
				{
					message: {
						id: messageId,
						role: "user",
						parts: [
							{
								type: "text",
								text: "Hello world",
							},
						],
					},
					conversationId,
				},
				{ context }
			);

			// Read streaming response
			const stream = eventIteratorToStream(result);
			const messages = readUIMessageStream<MyUIMessage>({ stream });

			let responseReceived = false;
			let responseText = "";

			for await (const message of messages) {
				expect(message.role).toBe("assistant");
				responseReceived = true;

				// Collect response text
				for (const part of message.parts) {
					if (part.type === "text") {
						responseText += part.text;
					}
				}
			}

			expect(responseReceived).toBe(true);
			expect(responseText.length).toBeGreaterThan(0);

			// Verify in database
			const dbConversation =
				await testEnv.deps.db.query.aiConversationsTable.findFirst({
					where: (table, { eq }) => eq(table.id, conversationId),
				});
			expect(dbConversation).toBeDefined();

			const dbMessages = await testEnv.deps.db.query.aiMessagesTable.findMany({
				where: (table, { eq }) => eq(table.conversationId, conversationId),
			});
			expect(dbMessages.length).toBeGreaterThanOrEqual(2); // user + assistant
		},
		TIMEOUT
	);

	test(
		"auto-create new conversation via chat",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			// Send message without conversationId (should auto-create)
			const result = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [
							{
								type: "text",
								text: "Create a new conversation",
							},
						],
					},
					// No conversationId provided
				},
				{ context }
			);

			// Consume stream
			const stream = eventIteratorToStream(result);
			const messages = readUIMessageStream<MyUIMessage>({ stream });

			let responseReceived = false;
			for await (const message of messages) {
				expect(message.role).toBe("assistant");
				responseReceived = true;
			}
			expect(responseReceived).toBe(true);

			// Verify a conversation was auto-created in DB
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

			// Verify it has messages
			const allMessages = await testEnv.deps.db.query.aiMessagesTable.findMany({
				where: (table, { eq }) => eq(table.conversationId, conversationId),
			});
			expect(allMessages.length).toBeGreaterThanOrEqual(2);
		},
		TIMEOUT
	);

	test(
		"continue existing conversation",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			const conversationId = typeIdGenerator("conversation");

			// First message
			const result1 = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "First message" }],
					},
					conversationId,
				},
				{ context }
			);

			// Consume first stream
			const stream1 = eventIteratorToStream(result1);
			const messages1 = readUIMessageStream<MyUIMessage>({ stream: stream1 });
			for await (const message of messages1) {
				expect(message.role).toBe("assistant");
			}

			// Second message to same conversation
			const result2 = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "Second message" }],
					},
					conversationId,
				},
				{ context }
			);

			// Consume second stream
			const stream2 = eventIteratorToStream(result2);
			const messages2 = readUIMessageStream<MyUIMessage>({ stream: stream2 });
			for await (const message of messages2) {
				expect(message.role).toBe("assistant");
			}

			// Verify conversation has all messages in DB
			const dbMessages = await testEnv.deps.db.query.aiMessagesTable.findMany({
				where: (table, { eq }) => eq(table.conversationId, conversationId),
				orderBy: (table, { asc }) => [asc(table.createdAt)],
			});

			expect(dbMessages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
			expect(dbMessages[0]?.role).toBe("user");
			expect(dbMessages[1]?.role).toBe("assistant");
			expect(dbMessages[2]?.role).toBe("user");
			expect(dbMessages[3]?.role).toBe("assistant");
		},
		TIMEOUT
	);

	test(
		"multi-turn conversation with context",
		async () => {
			const context = await createTestContext({
				token: testEnv.users.authenticated.token,
				testSetup: testEnv,
			});

			const conversationId = typeIdGenerator("conversation");

			// Turn 1: User introduces themselves
			const result1 = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "My name is Alice" }],
					},
					conversationId,
				},
				{ context }
			);

			const stream1 = eventIteratorToStream(result1);
			const messages1 = readUIMessageStream<MyUIMessage>({ stream: stream1 });
			for await (const message of messages1) {
				expect(message.role).toBe("assistant");
			}

			// Turn 2: User asks about their name
			const result2 = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "What is my name?" }],
					},
					conversationId,
				},
				{ context }
			);

			const stream2 = eventIteratorToStream(result2);
			const messages2 = readUIMessageStream<MyUIMessage>({ stream: stream2 });
			let secondResponse = "";
			for await (const message of messages2) {
				expect(message.role).toBe("assistant");
				for (const part of message.parts) {
					if (part.type === "text") {
						secondResponse += part.text;
					}
				}
			}

			// AI should remember the name from context
			expect(secondResponse.toLowerCase()).toContain("alice");

			// Turn 3: Follow-up question
			const result3 = await call(
				aiRouter.chat,
				{
					message: {
						id: typeIdGenerator("message"),
						role: "user",
						parts: [{ type: "text", text: "Count to 3" }],
					},
					conversationId,
				},
				{ context }
			);

			const stream3 = eventIteratorToStream(result3);
			const messages3 = readUIMessageStream<MyUIMessage>({ stream: stream3 });
			for await (const message of messages3) {
				expect(message.role).toBe("assistant");
			}

			// Verify all turns saved in DB
			const dbMessages = await testEnv.deps.db.query.aiMessagesTable.findMany({
				where: (table, { eq }) => eq(table.conversationId, conversationId),
			});

			const threeUserAndAssistant = 6;
			expect(dbMessages.length).toBeGreaterThanOrEqual(threeUserAndAssistant); // 3 user + 3 assistant

			// Verify conversation metadata
			const dbConversation =
				await testEnv.deps.db.query.aiConversationsTable.findFirst({
					where: (table, { eq }) => eq(table.id, conversationId),
				});
			expect(dbConversation).toBeDefined();
			expect(dbConversation?.userId).toBe(UserId.parse(testEnv.users.authenticated.id));
		},
		TIMEOUT
	);
});
