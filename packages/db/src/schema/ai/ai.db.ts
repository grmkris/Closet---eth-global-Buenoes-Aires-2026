import {
	type ConversationId,
	type MessageId,
	type MessagePartId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";
// AI Conversations
export const aiConversationsTable = pgTable(
	"ai_conversations",
	{
		id: typeId("conversation", "id")
			.$type<ConversationId>()
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("conversation")),
		userId: typeId("user", "user_id")
			.$type<UserId>()
			.notNull()
			.references(() => user.id),
		title: text("title"),
		model: varchar("model", { length: 100 }).notNull(),
		systemPrompt: text("system_prompt"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("ai_conversations_user_id_idx").on(table.userId),
		index("ai_conversations_updated_at_idx").on(table.updatedAt),
	]
);

// AI Messages
export const aiMessagesTable = pgTable(
	"ai_messages",
	{
		id: typeId("message", "id")
			.$type<MessageId>()
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("message")),
		conversationId: typeId("conversation", "conversation_id")
			.$type<ConversationId>()
			.notNull()
			.references(() => aiConversationsTable.id, { onDelete: "cascade" }),
		userId: typeId("user", "user_id")
			.$type<UserId>()
			.notNull()
			.references(() => user.id),
		role: varchar("role", { length: 20 })
			.notNull()
			.$type<"user" | "assistant">(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("ai_messages_conversation_id_idx").on(table.conversationId),
		index("ai_messages_created_at_idx").on(table.createdAt),
	]
);

// AI Message Parts (stores text, tool calls, tool results)
export const aiMessagePartsTable = pgTable(
	"ai_message_parts",
	{
		id: typeId("messagePart", "id")
			.$type<MessagePartId>()
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("messagePart")),
		messageId: typeId("message", "message_id")
			.$type<MessageId>()
			.notNull()
			.references(() => aiMessagesTable.id, { onDelete: "cascade" }),
		content: jsonb("content").notNull(),
	},
	(table) => [index("ai_message_parts_message_id_idx").on(table.messageId)]
);

// Relations
export const aiConversationsRelations = relations(
	aiConversationsTable,
	({ one, many }) => ({
		user: one(user, {
			fields: [aiConversationsTable.userId],
			references: [user.id],
		}),
		messages: many(aiMessagesTable),
	})
);

export const aiMessagesRelations = relations(
	aiMessagesTable,
	({ one, many }) => ({
		conversation: one(aiConversationsTable, {
			fields: [aiMessagesTable.conversationId],
			references: [aiConversationsTable.id],
		}),
		user: one(user, {
			fields: [aiMessagesTable.userId],
			references: [user.id],
		}),
		parts: many(aiMessagePartsTable),
	})
);

export const aiMessagePartsRelations = relations(
	aiMessagePartsTable,
	({ one }) => ({
		message: one(aiMessagesTable, {
			fields: [aiMessagePartsTable.messageId],
			references: [aiMessagesTable.id],
		}),
	})
);
