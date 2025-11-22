import { tool } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { and, eq } from "@ai-stilist/db/drizzle";
import { clothingItemsTable } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { UserId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { z } from "zod";

const MAX_WARDROBE_ITEMS_LIMIT = 50;

export const createAiTools = ({
	userId,
	db,
	logger,
}: {
	userId: UserId;
	db: Database;
	logger: Logger;
	storage?: StorageClient;
}) => ({
	getWardrobeItems: tool({
		description:
			"Search user's wardrobe for clothing items. Returns clothing items with their categories, colors, and tags. Useful for finding specific items, understanding what the user owns, or making outfit suggestions.",
		inputSchema: z.object({
			search: z
				.string()
				.optional()
				.describe(
					"Search text to filter items by category, tag, or color name"
				),
			limit: z
				.number()
				.min(1)
				.max(MAX_WARDROBE_ITEMS_LIMIT)
				.default(10)
				.describe("Maximum number of items to return"),
		}),
		execute: async ({ search, limit }: { search?: string; limit: number }) => {
			logger.debug({
				msg: "AI tool: getWardrobeItems",
				userId,
				search,
				limit,
			});

			// Build conditions
			const conditions = [eq(clothingItemsTable.userId, userId)];

			// Only return completed items
			conditions.push(eq(clothingItemsTable.status, "completed"));

			// Get items with all relations
			const items = await db.query.clothingItemsTable.findMany({
				where: and(...conditions),
				limit,
				orderBy: (item, { desc }) => [desc(item.createdAt)],
				with: {
					analysis: true,
					categories: {
						with: {
							category: true,
						},
					},
					colors: {
						with: {
							color: true,
						},
						orderBy: (colorItems, { asc }) => [asc(colorItems.order)],
					},
					tags: {
						with: {
							tag: {
								with: {
									type: true,
								},
							},
						},
					},
				},
			});

			// Transform to simplified format for AI
			const simplifiedItems = items.map((item) => ({
				id: item.id,
				categories: item.categories.map((c) => c.category.displayName),
				colors: item.colors.map((c) => c.color.name),
				tags: item.tags.map((t) => ({
					type: t.tag.type.displayName,
					value: t.tag.name,
				})),
				createdAt: item.createdAt,
			}));

			logger.info({
				msg: "AI tool: getWardrobeItems result",
				userId,
				itemCount: simplifiedItems.length,
			});

			return {
				items: simplifiedItems,
				count: simplifiedItems.length,
			};
		},
	}),
});

export type AiTools = ReturnType<typeof createAiTools>;
