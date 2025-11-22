import { type AiClient, tool } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	or,
	sql,
} from "@ai-stilist/db/drizzle";
import {
	categoriesTable,
	clothingItemCategoriesTable,
	clothingItemColorsTable,
	clothingItemsTable,
	clothingItemTagsTable,
	colorsTable,
	tagsTable,
	tagTypesTable,
} from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import {
	type ClothingItemWithMetadata,
	generateOutfitImage,
} from "@ai-stilist/wardrobe/generate-outfit-image";
import { z } from "zod";

const MAX_WARDROBE_ITEMS_LIMIT = 50;

export const createAiTools = ({
	userId,
	db,
	logger,
	storage,
	aiClient,
}: {
	userId: UserId;
	db: Database;
	logger: Logger;
	storage: StorageClient;
	aiClient: AiClient;
}) => ({
	searchWardrobe: tool({
		description:
			"Search and filter user's wardrobe for clothing items. Returns clothing items with their categories, colors, and tags. Supports filtering by categories, colors, tags, and full text search. Useful for finding specific items, understanding what the user owns, or making outfit suggestions.",
		inputSchema: z.object({
			categories: z
				.array(z.string())
				.optional()
				.describe(
					"Filter by category names (e.g., ['top', 'bottom', 'dress'])"
				),
			colors: z
				.array(z.string())
				.optional()
				.describe("Filter by color names (e.g., ['blue', 'white', 'black'])"),
			tags: z
				.array(z.string())
				.optional()
				.describe("Filter by tag names (e.g., ['casual', 'summer', 'cotton'])"),
			search: z
				.string()
				.optional()
				.describe(
					"Full text search across categories and tags (e.g., 'casual summer')"
				),
			limit: z
				.number()
				.min(1)
				.max(MAX_WARDROBE_ITEMS_LIMIT)
				.default(10)
				.describe("Maximum number of items to return"),
		}),
		execute: async ({
			categories,
			colors,
			tags,
			search,
			limit,
		}: {
			categories?: string[];
			colors?: string[];
			tags?: string[];
			search?: string;
			limit: number;
		}) => {
			logger.debug({
				msg: "AI tool: searchWardrobe",
				userId,
				categories,
				colors,
				tags,
				search,
				limit,
			});

			// Build WHERE conditions
			const conditions = [eq(clothingItemsTable.userId, userId)];

			// Only return completed items
			conditions.push(eq(clothingItemsTable.status, "completed"));

			// Category filter - use subquery
			if (categories?.length) {
				const categorySubquery = db
					.select({ itemId: clothingItemCategoriesTable.itemId })
					.from(clothingItemCategoriesTable)
					.innerJoin(
						categoriesTable,
						eq(categoriesTable.id, clothingItemCategoriesTable.categoryId)
					)
					.where(inArray(categoriesTable.name, categories));

				conditions.push(
					inArray(clothingItemsTable.id, sql`(${categorySubquery})`)
				);
			}

			// Tag filter - use subquery
			if (tags?.length) {
				const tagSubquery = db
					.select({ itemId: clothingItemTagsTable.itemId })
					.from(clothingItemTagsTable)
					.innerJoin(tagsTable, eq(tagsTable.id, clothingItemTagsTable.tagId))
					.where(inArray(tagsTable.name, tags));

				conditions.push(inArray(clothingItemsTable.id, sql`(${tagSubquery})`));
			}

			// Color filter - use subquery
			if (colors?.length) {
				const colorSubquery = db
					.select({ itemId: clothingItemColorsTable.itemId })
					.from(clothingItemColorsTable)
					.innerJoin(
						colorsTable,
						eq(colorsTable.id, clothingItemColorsTable.colorId)
					)
					.where(inArray(colorsTable.name, colors));

				conditions.push(
					inArray(clothingItemsTable.id, sql`(${colorSubquery})`)
				);
			}

			// Search filter - full text search in categories and tags
			if (search) {
				const searchPattern = `%${search.toLowerCase()}%`;

				const categorySearchSubquery = db
					.select({ itemId: clothingItemCategoriesTable.itemId })
					.from(clothingItemCategoriesTable)
					.innerJoin(
						categoriesTable,
						eq(categoriesTable.id, clothingItemCategoriesTable.categoryId)
					)
					.where(
						or(
							ilike(categoriesTable.name, searchPattern),
							ilike(categoriesTable.displayName, searchPattern)
						)
					);

				const tagSearchSubquery = db
					.select({ itemId: clothingItemTagsTable.itemId })
					.from(clothingItemTagsTable)
					.innerJoin(tagsTable, eq(tagsTable.id, clothingItemTagsTable.tagId))
					.where(ilike(tagsTable.name, searchPattern));

				const searchCondition = or(
					inArray(clothingItemsTable.id, sql`(${categorySearchSubquery})`),
					inArray(clothingItemsTable.id, sql`(${tagSearchSubquery})`)
				);

				if (searchCondition) {
					conditions.push(searchCondition);
				}
			}

			// Get items with all relations
			const items = await db.query.clothingItemsTable.findMany({
				where: and(...conditions),
				limit,
				orderBy: (item, { desc: descFn }) => [descFn(item.createdAt)],
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

			// Transform to AI-friendly format with grouped tags and thumbnail URLs
			const simplifiedItems = items.map((item) => {
				// Group tags by type
				const tagsByType: Record<string, string[]> = {};
				for (const tagItem of item.tags) {
					const typeName = tagItem.tag.type.name;
					if (!tagsByType[typeName]) {
						tagsByType[typeName] = [];
					}
					tagsByType[typeName].push(tagItem.tag.name);
				}

				return {
					id: item.id,
					categories: item.categories.map((c) => c.category.displayName),
					colors: item.colors.map((c) => ({
						name: c.color.name,
						hex: c.color.hexCode,
					})),
					tagsByType,
					thumbnailUrl: item.thumbnailKey
						? storage.getSignedUrl({
								key: item.thumbnailKey,
								expiresIn: 3600,
							})
						: null,
					createdAt: item.createdAt,
				};
			});

			logger.info({
				msg: "AI tool: searchWardrobe result",
				userId,
				itemCount: simplifiedItems.length,
				filters: { categories, colors, tags, search },
			});

			return {
				items: simplifiedItems,
				total: simplifiedItems.length,
				hasMore: simplifiedItems.length === limit,
			};
		},
	}),

	getWardrobeSummary: tool({
		description:
			"Get a high-level overview of the user's wardrobe. Returns total item count, available categories, colors with hex codes, and popular tags grouped by type. Useful for understanding wardrobe composition, identifying gaps, or suggesting combinations based on what's available.",
		inputSchema: z.object({}),
		execute: async () => {
			logger.debug({
				msg: "AI tool: getWardrobeSummary",
				userId,
			});

			// Aggregate tags with counts
			const tagsResult = await db
				.select({
					tag: tagsTable.name,
					type: tagTypesTable.name,
					typeDisplay: tagTypesTable.displayName,
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
				.groupBy(
					tagsTable.id,
					tagsTable.name,
					tagTypesTable.name,
					tagTypesTable.displayName
				)
				.orderBy(desc(count(clothingItemTagsTable.itemId)));

			// Aggregate categories with counts
			const categoriesResult = await db
				.select({
					name: categoriesTable.name,
					displayName: categoriesTable.displayName,
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
				.groupBy(
					categoriesTable.id,
					categoriesTable.name,
					categoriesTable.displayName
				)
				.orderBy(desc(count(clothingItemCategoriesTable.itemId)));

			// Aggregate colors with counts
			const colorsResult = await db
				.select({
					name: colorsTable.name,
					hexCode: colorsTable.hexCode,
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
				.groupBy(colorsTable.id, colorsTable.name, colorsTable.hexCode)
				.orderBy(desc(count(clothingItemColorsTable.itemId)));

			// Get total items count
			const totalItemsResult = await db
				.select({ count: count(clothingItemsTable.id).as("count") })
				.from(clothingItemsTable)
				.where(
					and(
						eq(clothingItemsTable.userId, userId),
						eq(clothingItemsTable.status, "completed")
					)
				);

			// Group tags by type and take top 10 per type
			const tagsByType: Record<string, string[]> = {};
			for (const tagItem of tagsResult) {
				if (!tagsByType[tagItem.type]) {
					tagsByType[tagItem.type] = [];
				}
				const typeArray = tagsByType[tagItem.type];
				// Only include top 10 tags per type
				if (typeArray && typeArray.length < 10) {
					typeArray.push(tagItem.tag);
				}
			}

			const result = {
				totalItems: totalItemsResult[0]?.count || 0,
				categories: categoriesResult.map((c) => ({
					name: c.displayName,
					count: c.count,
				})),
				colors: colorsResult.map((c) => ({
					name: c.name,
					hex: c.hexCode,
					count: c.count,
				})),
				topTagsByType: tagsByType,
			};

			logger.info({
				msg: "AI tool: getWardrobeSummary result",
				userId,
				totalItems: result.totalItems,
				categoryCount: result.categories.length,
				colorCount: result.colors.length,
				tagTypeCount: Object.keys(result.topTagsByType).length,
			});

			return result;
		},
	}),

	getItemDetails: tool({
		description:
			"Get complete details about a specific clothing item by ID. Returns all information including categories, colors with hex codes, all tags grouped by type, and image URLs. Useful when the AI needs detailed information about a particular item.",
		inputSchema: z.object({
			itemId: z.string().describe("The clothing item ID to get details for"),
		}),
		execute: async ({ itemId }: { itemId: string }) => {
			logger.debug({
				msg: "AI tool: getItemDetails",
				userId,
				itemId,
			});

			// Get item with all relations
			const item = await db.query.clothingItemsTable.findFirst({
				where: and(
					eq(clothingItemsTable.id, itemId as ClothingItemId),
					eq(clothingItemsTable.userId, userId),
					eq(clothingItemsTable.status, "completed")
				),
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

			if (!item) {
				logger.warn({
					msg: "AI tool: getItemDetails - item not found",
					userId,
					itemId,
				});
				throw new Error("Item not found or not accessible");
			}

			// Group tags by type
			const tagsByType: Record<string, string[]> = {};
			for (const tagItem of item.tags) {
				const typeName = tagItem.tag.type.name;
				if (!tagsByType[typeName]) {
					tagsByType[typeName] = [];
				}
				tagsByType[typeName].push(tagItem.tag.name);
			}

			const result = {
				id: item.id,
				categories: item.categories.map((c) => c.category.displayName),
				colors: item.colors.map((c) => ({
					name: c.color.name,
					hex: c.color.hexCode,
				})),
				tagsByType,
				imageUrl: storage.getSignedUrl({
					key: item.imageKey,
					expiresIn: 3600,
				}),
				processedImageUrl: item.processedImageKey
					? storage.getSignedUrl({
							key: item.processedImageKey,
							expiresIn: 3600,
						})
					: null,
				thumbnailUrl: item.thumbnailKey
					? storage.getSignedUrl({
							key: item.thumbnailKey,
							expiresIn: 3600,
						})
					: null,
				createdAt: item.createdAt,
				updatedAt: item.updatedAt,
			};

			logger.info({
				msg: "AI tool: getItemDetails result",
				userId,
				itemId,
			});

			return result;
		},
	}),

	generateOutfitPreview: tool({
		description:
			"Generate a visual preview image of an outfit combination using AI. Takes a list of clothing item IDs and creates a photorealistic visualization showing how the items look together. Useful when suggesting outfits to show the user what the combination would look like.",
		inputSchema: z.object({
			itemIds: z
				.array(z.string())
				.min(1)
				.max(10)
				.describe("Array of clothing item IDs to combine into an outfit"),
			occasion: z
				.string()
				.optional()
				.describe(
					"Optional occasion context (e.g., 'work', 'party', 'casual outing')"
				),
			style: z
				.string()
				.optional()
				.describe(
					"Optional style aesthetic (e.g., 'minimalist', 'streetwear', 'formal')"
				),
		}),
		execute: async ({
			itemIds,
			occasion,
			style,
		}: {
			itemIds: string[];
			occasion?: string;
			style?: string;
		}) => {
			logger.debug({
				msg: "AI tool: generateOutfitPreview",
				userId,
				itemIds,
				occasion,
				style,
			});

			// Fetch items with full metadata
			const items = await db.query.clothingItemsTable.findMany({
				where: and(
					eq(clothingItemsTable.userId, userId),
					eq(clothingItemsTable.status, "completed"),
					inArray(clothingItemsTable.id, itemIds as ClothingItemId[])
				),
				with: {
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

			// Validate all items exist and belong to user
			if (items.length !== itemIds.length) {
				const foundIds = new Set(items.map((item) => item.id));
				const missingIds = itemIds.filter(
					(id) => !foundIds.has(id as ClothingItemId)
				);
				throw new Error(
					`Some items not found or don't belong to user: ${missingIds.join(", ")}`
				);
			}

			// Validate all items have processed images
			const itemsWithoutImages = items.filter(
				(item) => !item.processedImageKey
			);
			if (itemsWithoutImages.length > 0) {
				throw new Error(
					`Some items are still processing: ${itemsWithoutImages.map((i) => i.id).join(", ")}`
				);
			}

			// Generate outfit image
			try {
				const result = await generateOutfitImage({
					items: items as ClothingItemWithMetadata[],
					occasion,
					style,
					aiClient,
					storageClient: storage,
					logger,
					userId,
				});

				logger.info({
					msg: "AI tool: generateOutfitPreview result",
					userId,
					imageUrl: result.imageUrl,
					storageKey: result.storageKey,
				});

				return {
					success: true,
					imageUrl: result.imageUrl,
					storageKey: result.storageKey,
					itemCount: items.length,
					message: `Generated outfit preview combining ${items.length} item${items.length > 1 ? "s" : ""}${occasion ? ` for ${occasion}` : ""}${style ? ` in ${style} style` : ""}. View the image at the URL above.`,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				logger.error({
					msg: "AI tool: generateOutfitPreview failed",
					userId,
					error: errorMessage,
				});

				return {
					success: false,
					error: errorMessage,
					message: `Failed to generate outfit preview: ${errorMessage}`,
				};
			}
		},
	}),
});

export type AiTools = ReturnType<typeof createAiTools>;
