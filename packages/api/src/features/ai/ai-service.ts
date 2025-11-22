import type { AiClient } from "@ai-stilist/ai";
import { convertToModelMessages, createUIMessageStream } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type {
	ConversationId,
	MessageId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { ORPCError, streamToEventIterator } from "@orpc/server";
import {
	createConversation,
	deleteConversation as deleteFullConversation,
	getConversation,
	getUserConversations,
	loadConversation,
	upsertMessages,
} from "./ai-store";
import { createAiTools } from "./ai-tools";
import type { MyUIMessage } from "./message-type";

type AiServiceDependencies = {
	db: Database;
	logger: Logger;
	aiClient: AiClient;
	storage: StorageClient;
};

const DEFAULT_SYSTEM_PROMPT = `You are a personal style AI assistant with access to the user's digital wardrobe.

You can:
- Search their clothing items by category, color, and tags
- Suggest outfit combinations for specific occasions
- Provide style advice based on their wardrobe
- Help them understand what they own

When making suggestions:
1. Be specific and reference actual items from their wardrobe
2. Consider color harmony and style coherence
3. Be conversational and friendly
4. Ask clarifying questions when needed

Always base your recommendations on their actual wardrobe items.`;

async function ensureConversationExists(params: {
	conversationId?: ConversationId;
	userId: UserId;
	model: string;
	systemPrompt?: string;
	db: Database;
	logger: Logger;
}): Promise<ConversationId> {
	const { conversationId, userId, model, systemPrompt, db, logger } = params;

	logger.debug({
		msg: "Ensuring conversation exists",
		conversationId,
		userId,
		model,
		systemPrompt,
	});

	if (!conversationId) {
		// Create new conversation
		return await createConversation({
			userId,
			model,
			systemPrompt,
			db,
		});
	}

	// Check if conversation exists and user owns it
	const existingConversation = await getConversation({
		conversationId,
		userId,
		db,
	});

	if (existingConversation) {
		return conversationId;
	}

	// Conversation doesn't exist - create it with the provided ID
	return await createConversation({
		userId,
		model,
		systemPrompt,
		id: conversationId,
		db,
	});
}

export async function createAiService(deps: {
	userId: UserId;
	deps: AiServiceDependencies;
}) {
	const { userId, deps: dependencies } = deps;
	const { db, logger, aiClient, storage } = dependencies;

	return {
		streamChat: async (params: {
			conversationId?: ConversationId;
			messages: MyUIMessage[];
			modelConfig?: {
				provider: "google" | "anthropic" | "groq" | "xai";
				modelId: string;
			};
			systemPrompt?: string;
		}) => {
			// 1. Get model configuration
			const modelConfig = params.modelConfig || {
				provider: "google" as const,
				modelId: "gemini-2.0-flash-exp",
			};

			// 2. Ensure conversation exists
			const conversationId = await ensureConversationExists({
				conversationId: params.conversationId,
				userId,
				model: modelConfig.modelId,
				systemPrompt: params.systemPrompt,
				db,
				logger,
			});

			// 3. Save incoming user messages
			await upsertMessages({
				conversationId,
				userId,
				messages: params.messages,
				db,
				logger,
			});

			// 4. Load full conversation history
			const allMessages = await loadConversation({
				conversationId,
				db,
			});

			// 5. Create AI tools with user context
			const tools = createAiTools({
				userId,
				db,
				logger,
				storage,
			});

			// 6. Get AI model
			const model = aiClient.getModel(modelConfig);

			// 7. Create UI message stream
			const stream = createUIMessageStream({
				generateId: () => typeIdGenerator("message"),
				execute: ({ writer }) => {
					const result = aiClient.streamText({
						model,
						system: params.systemPrompt || DEFAULT_SYSTEM_PROMPT,
						messages: convertToModelMessages(allMessages),
						tools,
						onError: (error) => {
							logger.error({
								msg: "AI stream error",
								conversationId,
								error: error instanceof Error ? error.message : String(error),
							});
						},
					});

					writer.merge(result.toUIMessageStream());
				},
				originalMessages: allMessages,
				onFinish: async ({ responseMessage }) => {
					try {
						// Save assistant response
						await upsertMessages({
							conversationId,
							userId,
							messages: [
								{
									id: responseMessage.id as MessageId,
									role: responseMessage.role as "assistant",
									parts: responseMessage.parts,
								} as MyUIMessage,
							],
							db,
							logger,
						});

						logger.info({
							msg: "AI stream completed",
							conversationId,
							responseMessageId: responseMessage.id,
						});
					} catch (error) {
						logger.error({
							msg: "Failed to persist AI response",
							conversationId,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				},
			});

			// 8. Convert to event iterator for ORPC
			return streamToEventIterator(stream);
		},

		loadConversation: async (conversationId: ConversationId) => {
			const conversation = await getConversation({
				conversationId,
				userId,
				db,
			});

			if (!conversation) {
				throw new ORPCError("NOT_FOUND", {
					message: "Conversation not found",
				});
			}

			const messages = await loadConversation({
				conversationId,
				db,
			});

			logger.debug({
				msg: "Loaded conversation",
				conversationId,
				messageCount: messages.length,
			});

			return {
				conversation,
				messages,
			};
		},

		listConversations: async (params: { page: number; limit: number }) => {
			const conversations = await getUserConversations({
				userId,
				page: params.page,
				limit: params.limit,
				db,
			});

			logger.debug({
				msg: "Listed conversations",
				userId,
				conversationCount: conversations.length,
				page: params.page,
				limit: params.limit,
			});

			return {
				conversations,
				pagination: {
					page: params.page,
					limit: params.limit,
					hasMore: conversations.length === params.limit,
				},
			};
		},

		deleteConversation: async (conversationId: ConversationId) => {
			// Verify user owns this conversation
			const conversation = await getConversation({
				conversationId,
				userId,
				db,
			});

			if (!conversation) {
				throw new ORPCError("NOT_FOUND", {
					message: "Conversation not found",
				});
			}

			await deleteFullConversation({
				conversationId,
				userId,
				db,
			});

			logger.info({
				msg: "Deleted conversation",
				conversationId,
				userId,
			});
		},
	};
}
