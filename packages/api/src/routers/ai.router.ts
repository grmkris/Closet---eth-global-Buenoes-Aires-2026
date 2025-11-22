import { API_LIMITS } from "@ai-stilist/shared/constants";
import { ConversationId, UserId } from "@ai-stilist/shared/typeid";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { createAiService } from "../features/ai/ai-service";
import type { MyUIMessage } from "../features/ai/message-type";
import { protectedProcedure } from "../index";

// Chat input schema - accepts either single message or array of messages
const ChatInputSchema = z
	.object({
		message: z.custom<MyUIMessage>().optional(),
		messages: z.array(z.custom<MyUIMessage>()).optional(),
		conversationId: ConversationId.optional(),
		modelConfig: z
			.object({
				provider: z.enum(["google", "anthropic", "groq", "xai"]),
				modelId: z.string(),
			})
			.optional(),
		systemPrompt: z.string().optional(),
	})
	.refine(
		(data) =>
			(data.message && !data.messages) || (!data.message && data.messages),
		{
			message: "Either 'message' or 'messages' must be provided, but not both",
		}
	);

// List conversations input schema
const ListConversationsSchema = z.object({
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(API_LIMITS.MAX_ITEMS_PER_PAGE).optional(),
});

export const aiRouter = {
	chat: protectedProcedure
		.input(ChatInputSchema)
		.handler(async ({ input, context }) => {
			try {
				const session = context.session;

				if (!session) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "Authentication required",
					});
				}

				const userId = UserId.parse(session.user.id);

				// Normalize to array of messages
				const messages =
					input.messages || (input.message ? [input.message] : []);

				context.logger.info({
					msg: "AI chat request",
					conversationId: input.conversationId,
					messageCount: messages.length,
					userId,
				});

				// Create AI service
				const aiService = await createAiService({
					userId,
					deps: {
						db: context.db,
						logger: context.logger,
						aiClient: context.aiClient,
						storage: context.storage,
					},
				});

				// Stream chat (returns event iterator)
				const result = await aiService.streamChat({
					conversationId: input.conversationId,
					messages,
					modelConfig: input.modelConfig,
					systemPrompt: input.systemPrompt,
				});

				return result;
			} catch (error) {
				context.logger.error({
					msg: "AI chat error",
					error: error instanceof Error ? error.message : String(error),
					conversationId: input.conversationId,
					userId: context.session?.user.id,
					stack: error instanceof Error ? error.stack : undefined,
				});

				if (error instanceof ORPCError) {
					throw error;
				}

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message:
						error instanceof Error
							? error.message
							: "An unexpected error occurred during chat processing",
				});
			}
		}),

	loadConversation: protectedProcedure
		.input(z.object({ conversationId: ConversationId }))
		.handler(async ({ input, context }) => {
			try {
				const session = context.session;

				if (!session) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "Authentication required",
					});
				}

				const userId = UserId.parse(session.user.id);

				const aiService = await createAiService({
					userId,
					deps: {
						db: context.db,
						logger: context.logger,
						aiClient: context.aiClient,
						storage: context.storage,
					},
				});

				return await aiService.loadConversation(input.conversationId);
			} catch (error) {
				if (error instanceof ORPCError) {
					throw error;
				}

				context.logger.error({
					msg: "Failed to load conversation",
					conversationId: input.conversationId,
					error: error instanceof Error ? error.message : String(error),
				});

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to load conversation",
				});
			}
		}),

	listConversations: protectedProcedure
		.input(ListConversationsSchema)
		.handler(async ({ input, context }) => {
			try {
				const session = context.session;

				if (!session) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "Authentication required",
					});
				}

				const userId = UserId.parse(session.user.id);

				const aiService = await createAiService({
					userId,
					deps: {
						db: context.db,
						logger: context.logger,
						aiClient: context.aiClient,
						storage: context.storage,
					},
				});

				return await aiService.listConversations({
					page: input.page ?? 1,
					limit: input.limit ?? API_LIMITS.DEFAULT_ITEMS_PER_PAGE,
				});
			} catch (error) {
				context.logger.error({
					msg: "Failed to list conversations",
					error: error instanceof Error ? error.message : String(error),
					userId: context.session?.user.id,
				});

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to list conversations",
				});
			}
		}),

	deleteConversation: protectedProcedure
		.input(z.object({ conversationId: ConversationId }))
		.handler(async ({ input, context }) => {
			try {
				const session = context.session;

				if (!session) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "Authentication required",
					});
				}

				const userId = UserId.parse(session.user.id);

				const aiService = await createAiService({
					userId,
					deps: {
						db: context.db,
						logger: context.logger,
						aiClient: context.aiClient,
						storage: context.storage,
					},
				});

				await aiService.deleteConversation(input.conversationId);

				context.logger.info({
					msg: "Deleted conversation",
					conversationId: input.conversationId,
					userId,
				});

				return { success: true };
			} catch (error) {
				if (error instanceof ORPCError) {
					throw error;
				}

				context.logger.error({
					msg: "Failed to delete conversation",
					conversationId: input.conversationId,
					error: error instanceof Error ? error.message : String(error),
				});

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to delete conversation",
				});
			}
		}),
};
