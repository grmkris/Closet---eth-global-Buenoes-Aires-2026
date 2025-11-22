import { convertToCoreMessages } from "@ai-stilist/ai";
import {
	ConversationId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
import { z } from "zod";
import {
	createConversation,
	loadConversation,
	upsertMessages,
} from "../features/ai/ai-store";
import { createAiTools } from "../features/ai/ai-tools";
import type { MyUIMessage } from "../features/ai/message-type";
import { protectedProcedure } from "../index";

// Chat input schema
const ChatInputSchema = z.object({
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
});

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

export const aiRouter = {
	chat: protectedProcedure
		.input(ChatInputSchema)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Normalize to array of messages
			const newMessages =
				input.messages || (input.message ? [input.message] : []);

			// Create or load conversation
			const conversationId =
				input.conversationId || typeIdGenerator("conversation");

			// Load existing conversation history
			let history: MyUIMessage[] = [];
			if (input.conversationId) {
				history = await loadConversation({
					conversationId: input.conversationId,
					db: context.db,
				});
			} else {
				// Create new conversation
				await createConversation({
					userId,
					model: input.modelConfig?.modelId || "gemini-2.0-flash-exp",
					systemPrompt: input.systemPrompt,
					id: conversationId,
					db: context.db,
				});
			}

			// Merge history with new messages
			const allMessages = [...history, ...newMessages];

			// Create AI tools with user context
			const tools = createAiTools({
				userId,
				db: context.db,
				logger: context.logger,
				storage: context.storage,
			});

			context.logger.info({
				msg: "AI chat request",
				conversationId,
				userId,
				messageCount: allMessages.length,
				newMessageCount: newMessages.length,
			});

			// Get AI model
			const modelConfig = input.modelConfig || {
				provider: "google" as const,
				modelId: "gemini-2.0-flash-exp",
			};
			const model = context.aiClient.getModel(modelConfig);

			// Stream response
			const result = context.aiClient.streamText({
				model,
				system: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
				messages: convertToCoreMessages(allMessages),
				tools,
				onFinish: async (event) => {
					// Save all messages (including AI response)
					const finalMessages = [
						...allMessages,
						{
							id: typeIdGenerator("message"),
							role: "assistant" as const,
							parts: event.text
								? [{ type: "text" as const, text: event.text }]
								: [],
						},
					];

					await upsertMessages({
						conversationId,
						userId,
						messages: finalMessages as MyUIMessage[],
						db: context.db,
						logger: context.logger,
					});

					context.logger.info({
						msg: "AI chat completed",
						conversationId,
						userId,
					});
				},
			});

			// Return text stream response for ORPC
			return result.toTextStreamResponse();
		}),

	loadConversation: protectedProcedure
		.input(z.object({ conversationId: ConversationId }))
		.handler(async ({ input, context }) => {
			const messages = await loadConversation({
				conversationId: input.conversationId,
				db: context.db,
			});

			return { messages };
		}),
};
