import type { Database, Transaction } from "@ai-stilist/db";
import { and, desc, eq, gt, sql } from "@ai-stilist/db/drizzle";
import {
	aiConversationsTable,
	aiMessagePartsTable,
	aiMessagesTable,
} from "@ai-stilist/db/schema/ai";
import type { Logger } from "@ai-stilist/logger";
import type { ConversationId, UserId } from "@ai-stilist/shared/typeid";
import { MessageId, typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { MyUIMessage, MyUIMessagePart } from "./message-type";

export async function createConversation(props: {
	userId: UserId;
	model: string;
	systemPrompt?: string;
	id?: ConversationId;
	db: Database;
}): Promise<ConversationId> {
	const { userId, model, systemPrompt, id, db } = props;

	const [conversation] = await db
		.insert(aiConversationsTable)
		.values({
			...(id && { id }),
			userId,
			model,
			systemPrompt,
		})
		.returning();

	if (!conversation) {
		throw new Error("Failed to create conversation");
	}

	return conversation.id;
}

export async function upsertMessages({
	conversationId,
	userId,
	messages,
	db,
	logger,
}: {
	conversationId: ConversationId;
	userId: UserId;
	messages: MyUIMessage[];
	db: Database | Transaction;
	logger: Logger;
}): Promise<void> {
	try {
		await db.transaction(async (tx) => {
			// Insert or update messages
			await tx
				.insert(aiMessagesTable)
				.values(
					messages.map((message) => ({
						id: MessageId.parse(message.id),
						conversationId,
						userId,
						role: message.role as "user" | "assistant",
					}))
				)
				.onConflictDoNothing();

			logger.debug({
				msg: "Upserted messages",
				conversationId,
				messageCount: messages.length,
			});

			// Upsert parts
			const parts = messages.flatMap((message) =>
				message.parts.map((part) => ({
					id: typeIdGenerator("messagePart"),
					messageId: MessageId.parse(message.id),
					content: part,
				}))
			);

			logger.debug({
				msg: "Upserting parts",
				conversationId,
				partCount: parts.length,
			});

			if (parts.length > 0) {
				await tx
					.insert(aiMessagePartsTable)
					.values(parts)
					.onConflictDoUpdate({
						target: aiMessagePartsTable.id,
						set: {
							content: sql.raw(`excluded.${aiMessagePartsTable.content.name}`),
						},
					});
			}

			// Update conversation's updatedAt timestamp
			await tx
				.update(aiConversationsTable)
				.set({ updatedAt: new Date() })
				.where(eq(aiConversationsTable.id, conversationId));
		});
	} catch (error) {
		logger.error({
			msg: "Failed to upsert messages",
			conversationId,
			userId,
			messageCount: messages.length,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

export async function loadConversation(props: {
	conversationId: ConversationId;
	db: Database;
}): Promise<MyUIMessage[]> {
	const { conversationId, db } = props;

	const result = await db.query.aiMessagesTable.findMany({
		where: eq(aiMessagesTable.conversationId, conversationId),
		with: {
			parts: {
				orderBy: (part, { asc }) => [asc(part.id)],
			},
		},
		orderBy: (messages, { asc }) => [asc(messages.createdAt)],
	});

	return result.map((message) => ({
		...message,
		role: message.role,
		parts: message.parts.map((p) => p.content as MyUIMessagePart), // TODO somehow get MyUIMessagePart from the database
	}));
}

export async function getUserConversations(props: {
	userId: UserId;
	page?: number;
	limit?: number;
	db: Database;
}): Promise<
	Array<{
		id: ConversationId;
		title: string | null;
		model: string;
		createdAt: Date;
		updatedAt: Date;
		lastMessageAt?: Date;
	}>
> {
	const { userId, page = 1, limit = 20, db } = props;
	const offset = (page - 1) * limit;

	const conversations = await db.query.aiConversationsTable.findMany({
		where: eq(aiConversationsTable.userId, userId),
		orderBy: [desc(aiConversationsTable.updatedAt)],
		limit,
		offset,
		with: {
			messages: {
				orderBy: [desc(aiMessagesTable.createdAt)],
				limit: 1,
			},
		},
	});

	return conversations.map((conv) => ({
		id: conv.id,
		title: conv.title,
		model: conv.model,
		createdAt: conv.createdAt,
		updatedAt: conv.updatedAt,
		lastMessageAt: conv.messages[0]?.createdAt,
	}));
}

export async function getConversation(props: {
	conversationId: ConversationId;
	userId: UserId;
	db: Database;
}) {
	const { conversationId, userId, db } = props;

	const conversation = await db.query.aiConversationsTable.findFirst({
		where: and(
			eq(aiConversationsTable.id, conversationId),
			eq(aiConversationsTable.userId, userId)
		),
	});

	return conversation;
}

export async function updateConversationTitle(props: {
	conversationId: ConversationId;
	userId: UserId;
	title: string;
	db: Database;
}): Promise<void> {
	const { conversationId, userId, title, db } = props;

	await db
		.update(aiConversationsTable)
		.set({
			title,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(aiConversationsTable.id, conversationId),
				eq(aiConversationsTable.userId, userId)
			)
		);
}

export async function deleteConversation(props: {
	conversationId: ConversationId;
	userId: UserId;
	db: Database;
}): Promise<void> {
	const { conversationId, userId, db } = props;

	await db
		.delete(aiConversationsTable)
		.where(
			and(
				eq(aiConversationsTable.id, conversationId),
				eq(aiConversationsTable.userId, userId)
			)
		);
}

export async function deleteMessageAndSubsequent(props: {
	messageId: MessageId;
	userId: UserId;
	db: Database;
}): Promise<void> {
	const { messageId, userId, db } = props;

	await db.transaction(async (tx) => {
		// Find the target message and verify user ownership
		const targetMessage = await tx.query.aiMessagesTable.findFirst({
			where: eq(aiMessagesTable.id, messageId),
			with: {
				conversation: {
					columns: {
						id: true,
						userId: true,
					},
				},
			},
		});

		if (!targetMessage || targetMessage.conversation.userId !== userId) {
			throw new Error("Message not found or access denied");
		}

		// Delete all messages after this one in the conversation
		await tx
			.delete(aiMessagesTable)
			.where(
				and(
					eq(aiMessagesTable.conversationId, targetMessage.conversationId),
					gt(aiMessagesTable.createdAt, targetMessage.createdAt)
				)
			);

		// Delete the target message (cascade delete will handle parts)
		await tx.delete(aiMessagesTable).where(eq(aiMessagesTable.id, messageId));

		// Update conversation's updatedAt timestamp
		await tx
			.update(aiConversationsTable)
			.set({ updatedAt: new Date() })
			.where(eq(aiConversationsTable.id, targetMessage.conversationId));
	});
}
