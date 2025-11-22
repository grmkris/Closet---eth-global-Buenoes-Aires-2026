import type { AiClient } from "@ai-stilist/ai";
import {
	convertToModelMessages,
	createUIMessageStream,
	generateText,
} from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import { WARDROBE_AI_CONSTANTS } from "@ai-stilist/shared/constants";
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
	updateConversationTitle,
	upsertMessages,
} from "./ai-store";
import { createAiTools } from "./ai-tools";
import type { MyUIMessage } from "./message-type";
import { buildContextualSystemPrompt } from "./system-prompts";

type AiServiceDependencies = {
	db: Database;
	logger: Logger;
	aiClient: AiClient;
	storage: StorageClient;
};

/**
 * Get user info for context
 */
async function getUserInfo(params: {
	userId: UserId;
	db: Database;
}): Promise<{ name?: string }> {
	const { userId, db } = params;

	const user = await db.query.user.findFirst({
		where: (t, { eq }) => eq(t.id, userId),
		columns: { name: true },
	});

	return {
		name: user?.name || undefined,
	};
}

/**
 * Infer the current season based on the month
 */
function inferSeason(date: Date): string {
	const month = date.getMonth(); // 0-11 (January = 0, December = 11)

	// Northern Hemisphere seasons
	if (
		month >= WARDROBE_AI_CONSTANTS.SPRING_MONTH_START &&
		month <= WARDROBE_AI_CONSTANTS.SPRING_MONTH_END
	) {
		return "spring"; // March-May
	}
	if (
		month >= WARDROBE_AI_CONSTANTS.SUMMER_MONTH_START &&
		month <= WARDROBE_AI_CONSTANTS.SUMMER_MONTH_END
	) {
		return "summer"; // June-August
	}
	if (
		month >= WARDROBE_AI_CONSTANTS.FALL_MONTH_START &&
		month <= WARDROBE_AI_CONSTANTS.FALL_MONTH_END
	) {
		return "fall"; // September-November
	}
	return "winter"; // December-February
}

/**
 * Generate a concise conversation title using LLM
 */
const generateTitleWithLLM = async (params: {
	messages: MyUIMessage[];
	logger: Logger;
	aiClient: AiClient;
}): Promise<string | null> => {
	const { messages, logger, aiClient } = params;

	try {
		// Use a fast model for title generation
		const titleModel = aiClient.getModel({
			provider: "google",
			modelId: "gemini-2.0-flash-exp",
		});

		// Use LLM to generate a concise, descriptive title
		const { text } = await generateText({
			model: titleModel,
			system:
				"You are a helpful assistant that generates very short, concise titles for chat conversations. Generate a title that captures the main topic or purpose of the conversation in 3-6 words maximum. Do not use quotes, punctuation, or special characters. Be descriptive but brief.",
			prompt: `Generate a short title for this conversation:\n\n${messages
				.map((message) =>
					message.parts
						.map((part) => (part.type === "text" ? part.text : ""))
						.join(" ")
				)
				.join("\n")}\n\nTitle:`,
		});

		// Clean and truncate the title
		const cleanTitle = text
			.trim()
			.replace(/["']/g, "") // Remove quotes
			.trim();
		return cleanTitle || null;
	} catch (error) {
		logger.error({
			msg: "Failed to generate title with LLM",
			error: error instanceof Error ? error.message : String(error),
		});

		// Fallback to simple date and time
		const now = new Date();
		return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
	}
};

/**
 * Generate wardrobe context to inject into system prompt
 * Provides temporal context and wardrobe summary
 */
async function generateWardrobeContext(params: {
	userId: UserId;
	db: Database;
	logger: Logger;
}): Promise<string> {
	const { userId, db, logger } = params;

	logger.debug({ msg: "Generating wardrobe context", userId });

	try {
		// Import getTags query logic from wardrobe router
		const {
			count,
			desc: descFn,
			eq,
			and,
		} = await import("@ai-stilist/db/drizzle");
		const {
			clothingItemsTable,
			clothingItemTagsTable,
			clothingItemCategoriesTable,
			clothingItemColorsTable,
			tagsTable,
			tagTypesTable,
			categoriesTable,
			colorsTable,
		} = await import("@ai-stilist/db/schema/wardrobe");

		// Get wardrobe summary (similar to getTags endpoint)
		const [tagsResult, categoriesResult, colorsResult, totalItemsResult] =
			await Promise.all([
				// Tags with counts
				db
					.select({
						tag: tagsTable.name,
						type: tagTypesTable.name,
						count: count(clothingItemTagsTable.itemId).as("count"),
					})
					.from(clothingItemTagsTable)
					.innerJoin(tagsTable, eq(tagsTable.id, clothingItemTagsTable.tagId))
					.innerJoin(tagTypesTable, eq(tagTypesTable.id, tagsTable.typeId))
					.innerJoin(
						clothingItemsTable,
						eq(clothingItemsTable.id, clothingItemTagsTable.itemId)
					)
					.where(
						and(
							eq(clothingItemsTable.userId, userId),
							eq(clothingItemsTable.status, "completed")
						)
					)
					.groupBy(tagsTable.id, tagsTable.name, tagTypesTable.name)
					.orderBy(descFn(count(clothingItemTagsTable.itemId)))
					.limit(WARDROBE_AI_CONSTANTS.TOP_TAGS_LIMIT), // Top tags for context

				// Categories with counts
				db
					.select({
						name: categoriesTable.name,
						count: count(clothingItemCategoriesTable.itemId).as("count"),
					})
					.from(clothingItemCategoriesTable)
					.innerJoin(
						categoriesTable,
						eq(categoriesTable.id, clothingItemCategoriesTable.categoryId)
					)
					.innerJoin(
						clothingItemsTable,
						eq(clothingItemsTable.id, clothingItemCategoriesTable.itemId)
					)
					.where(
						and(
							eq(clothingItemsTable.userId, userId),
							eq(clothingItemsTable.status, "completed")
						)
					)
					.groupBy(categoriesTable.id, categoriesTable.name)
					.orderBy(descFn(count(clothingItemCategoriesTable.itemId))),

				// Colors with counts
				db
					.select({
						name: colorsTable.name,
						count: count(clothingItemColorsTable.itemId).as("count"),
					})
					.from(clothingItemColorsTable)
					.innerJoin(
						colorsTable,
						eq(colorsTable.id, clothingItemColorsTable.colorId)
					)
					.innerJoin(
						clothingItemsTable,
						eq(clothingItemsTable.id, clothingItemColorsTable.itemId)
					)
					.where(
						and(
							eq(clothingItemsTable.userId, userId),
							eq(clothingItemsTable.status, "completed")
						)
					)
					.groupBy(colorsTable.id, colorsTable.name)
					.orderBy(descFn(count(clothingItemColorsTable.itemId)))
					.limit(10), // Top 10 colors

				// Total items
				db
					.select({ count: count(clothingItemsTable.id).as("count") })
					.from(clothingItemsTable)
					.where(
						and(
							eq(clothingItemsTable.userId, userId),
							eq(clothingItemsTable.status, "completed")
						)
					),
			]);

		const totalItems = totalItemsResult[0]?.count || 0;

		// If wardrobe is empty, return minimal context
		if (totalItems === 0) {
			const now = new Date();
			const season = inferSeason(now);
			return `
Current Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Season: ${season}

The user's wardrobe is currently empty. Help them get started by asking what they'd like to add.`;
		}

		// Generate context string
		const now = new Date();
		const season = inferSeason(now);
		const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

		const categorySummary = categoriesResult
			.map((c) => `${c.name} (${c.count})`)
			.join(", ");
		const colorSummary = colorsResult
			.slice(0, WARDROBE_AI_CONSTANTS.TOP_COLORS_LIMIT)
			.map((c) => c.name)
			.join(", ");
		const topTags = tagsResult
			.slice(0, WARDROBE_AI_CONSTANTS.TOP_TAGS_IN_SUMMARY)
			.map((t) => t.tag)
			.join(", ");

		const context = `
Current Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Day: ${dayOfWeek}
Season: ${season}

Wardrobe Overview:
- Total items: ${totalItems}
- Categories: ${categorySummary}
- Main colors: ${colorSummary}
- Popular tags: ${topTags}

Use this context when making recommendations. Consider the current season and day when suggesting outfits.`;

		logger.info({
			msg: "Wardrobe context generated",
			userId,
			totalItems,
			categoriesCount: categoriesResult.length,
			colorsCount: colorsResult.length,
			tagsCount: tagsResult.length,
		});

		return context;
	} catch (error) {
		logger.error({
			msg: "Failed to generate wardrobe context",
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		// Return minimal context on error
		const now = new Date();
		const season = inferSeason(now);
		return `
Current Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Season: ${season}`;
	}
}

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

export function createAiService(deps: {
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

			// 3. Get user info for context
			const userInfo = await getUserInfo({ userId, db });

			// 4. Generate wardrobe context for system prompt
			const wardrobeContext = await generateWardrobeContext({
				userId,
				db,
				logger,
			});

			// 5. Build enhanced system prompt with context
			const now = new Date();
			const enhancedSystemPrompt = buildContextualSystemPrompt({
				currentDateAndTime: now.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
				}),
				dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
				season: inferSeason(now),
				userName: userInfo.name,
				userId,
				wardrobeContext,
				customPrompt: params.systemPrompt,
			});

			// 6. Save incoming user messages
			await upsertMessages({
				conversationId,
				userId,
				messages: params.messages,
				db,
				logger,
			});

			// 7. Load full conversation history
			const allMessages = await loadConversation({
				conversationId,
				db,
			});

			// 8. Create AI tools with user context
			const tools = createAiTools({
				userId,
				db,
				logger,
				storage,
				aiClient,
			});

			// 9. Get AI model
			const model = aiClient.getModel(modelConfig);

			// 10. Create UI message stream
			const stream = createUIMessageStream({
				generateId: () => typeIdGenerator("message"),
				execute: ({ writer }) => {
					const result = aiClient.streamText({
						model,
						stopWhen: [],
						system: enhancedSystemPrompt,
						messages: convertToModelMessages(allMessages),
						tools,
						prepareStep: ({ stepNumber }) => {
							// Placeholder for future step-based tool control
							// For now, all tools are available at all steps
							logger.debug({
								msg: "AI stream step",
								conversationId,
								stepNumber,
							});
							return {};
						},
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

						// Auto-generate title if first exchange
						if (!params.conversationId && allMessages.length <= 2) {
							const title = await generateTitleWithLLM({
								messages: [...allMessages, responseMessage as MyUIMessage],
								logger,
								aiClient,
							});

							if (title) {
								await updateConversationTitle({
									conversationId,
									userId,
									title,
									db,
								});

								logger.info({
									msg: "Auto-generated conversation title",
									conversationId,
									title,
								});
							}
						}

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

			// 11. Convert to event iterator for ORPC
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

		renameConversation: async (
			conversationId: ConversationId,
			title: string
		) => {
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

			await updateConversationTitle({
				conversationId,
				userId,
				title,
				db,
			});

			logger.info({
				msg: "Renamed conversation",
				conversationId,
				userId,
				newTitle: title,
			});
		},
	};
}
