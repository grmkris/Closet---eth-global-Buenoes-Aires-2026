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
import { ClothingItemId, type UserId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import {
	type ClothingItemWithMetadata,
	generateOutfitImage,
} from "@ai-stilist/wardrobe/generate-outfit-image";
import { z } from "zod";

const MAX_WARDROBE_ITEMS_LIMIT = 50;

// Zod schemas for marketplace API responses
const MarketplaceItemMetadataSchema = z.object({
	size: z.array(z.string()).optional(),
	color: z.array(z.string()).optional(),
	material: z.string().optional(),
});

const MarketplaceItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	category: z.string(),
	brand: z.string(),
	price: z.number(),
	imageUrl: z.string().url(),
	available: z.boolean(),
	metadata: MarketplaceItemMetadataSchema,
});

const MarketplaceItemsResponseSchema = z.object({
	items: z.array(MarketplaceItemSchema),
	total: z.number(),
});

const MarketplacePurchaseResponseSchema = z.object({
	success: z.boolean(),
	item: MarketplaceItemSchema,
	purchase: z.object({
		id: z.string(),
		signature: z.string(),
		timestamp: z.string(),
		txHash: z.string().optional(), // May be added later
	}),
});

// Export schemas for use in client components
export { MarketplaceItemSchema, MarketplacePurchaseResponseSchema };
export type MarketplaceItem = z.infer<typeof MarketplaceItemSchema>;
export type MarketplacePurchaseResponse = z.infer<
	typeof MarketplacePurchaseResponseSchema
>;

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
		execute: async ({ categories, colors, tags, search, limit }) => {
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
					status: item.status,
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
			itemId: ClothingItemId.describe(
				"The clothing item ID to get details for"
			),
		}),
		execute: async ({ itemId }) => {
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

	showItems: tool({
		description:
			"Display clothing items to the user in a visual format. Use this tool to show specific items when making outfit recommendations, responding to wardrobe queries, or any time you reference specific clothing items. NEVER include item IDs in your text responses - always use this tool to display items visually instead.",
		inputSchema: z.object({
			itemIds: z
				.array(ClothingItemId)
				.min(1)
				.max(20)
				.describe("Array of clothing item IDs to display to the user"),
		}),
		execute: async ({ itemIds }) => {
			logger.debug({
				msg: "AI tool: showItems",
				userId,
				itemIds,
			});

			// Fetch items with all relations
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

			// Transform items to display format
			const displayItems = items.map((item) => {
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
					status: item.status,
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
				};
			});

			// Validate all requested items were found
			const foundIds = new Set(items.map((item) => item.id));
			const missingIds = itemIds.filter(
				(id) => !foundIds.has(id as ClothingItemId)
			);

			if (missingIds.length > 0) {
				logger.warn({
					msg: "AI tool: showItems - some items not found",
					userId,
					missingIds,
				});
			}

			logger.info({
				msg: "AI tool: showItems result",
				userId,
				itemCount: displayItems.length,
				requestedCount: itemIds.length,
			});

			return {
				items: displayItems,
				displayedCount: displayItems.length,
				requestedCount: itemIds.length,
				notFound: missingIds.length > 0 ? missingIds : undefined,
			};
		},
	}),

	generateOutfitPreview: tool({
		description:
			"Generate a visual preview image of an outfit combination using AI. Takes a list of clothing item IDs and creates a photorealistic visualization showing how the items look together. ⚠️ IMPORTANT: ONLY use when user explicitly requests visualization ('show me', 'what would that look like', 'preview', 'visualize') OR after you propose a preview and user agrees. DO NOT auto-generate previews for every outfit suggestion - always ask first.",
		inputSchema: z.object({
			itemIds: z
				.array(ClothingItemId)
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
			itemIds: ClothingItemId[];
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
					aspectRatio: "1:1",
					imageSize: "1K",
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
					// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <TODO>
					items: items.map((item) => {
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
							category:
								item.categories[0]?.category.displayName || "uncategorized",
							tags: tagsByType,
							thumbnailUrl: item.thumbnailKey
								? storage.getSignedUrl({
										key: item.thumbnailKey,
										expiresIn: 3600,
									})
								: null,
							imageUrl: item.imageKey
								? storage.getSignedUrl({
										key: item.imageKey,
										expiresIn: 3600,
									})
								: null,
							processedImageUrl: item.processedImageKey
								? storage.getSignedUrl({
										key: item.processedImageKey,
										expiresIn: 3600,
									})
								: null,
						};
					}),
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

	searchExternalMarketplace: tool({
		description:
			"Browse external marketplace for fashion items. Call with NO parameters to browse all available items. Optionally filter by category or price range only if user explicitly mentions specific preferences. Returns available items that can be purchased.",
		inputSchema: z.object({
			category: z
				.string()
				.optional()
				.describe(
					"OPTIONAL: Only use if user explicitly mentions a category (e.g., 'outerwear', 'footwear', 'tops', 'bottoms', 'accessories'). Leave empty to browse all categories."
				),
			minPrice: z
				.number()
				.optional()
				.describe(
					"OPTIONAL: Only use if user explicitly mentions a minimum price. Leave empty otherwise."
				),
			maxPrice: z
				.number()
				.optional()
				.describe(
					"OPTIONAL: Only use if user explicitly mentions a maximum price. Leave empty otherwise."
				),
		}),
		execute: async ({ category, minPrice, maxPrice }) => {
			// Hardcode marketplace URL - there's only one marketplace
			const marketplaceUrl = "http://localhost:3003";

			logger.debug({
				msg: "AI tool: searchExternalMarketplace",
				userId,
				marketplaceUrl,
				category,
				minPrice,
				maxPrice,
			});

			try {
				// Build URL with query parameters
				const url = new URL(`${marketplaceUrl}/api/items`);
				if (category) {
					url.searchParams.set("category", category);
				}
				if (minPrice !== undefined) {
					url.searchParams.set("minPrice", minPrice.toString());
				}
				if (maxPrice !== undefined) {
					url.searchParams.set("maxPrice", maxPrice.toString());
				}

				logger.debug({
					msg: "Fetching from marketplace",
					url: url.toString(),
				});

				// Fetch items from marketplace
				const response = await fetch(url.toString());

				if (!response.ok) {
					throw new Error(
						`Marketplace request failed: ${response.status} ${response.statusText}`
					);
				}

				const json = await response.json();
				const data = MarketplaceItemsResponseSchema.parse(json);

				logger.info({
					msg: "AI tool: searchExternalMarketplace result",
					userId,
					itemCount: data.total,
					filters: { category, minPrice, maxPrice },
				});

				return {
					success: true,
					items: data.items,
					itemCount: data.total,
					message: `Found ${data.total} item${data.total !== 1 ? "s" : ""} in marketplace`,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				logger.error({
					msg: "AI tool: searchExternalMarketplace failed",
					userId,
					error: errorMessage,
				});

				return {
					success: false,
					items: [],
					itemCount: 0,
					error: errorMessage,
					message: `Failed to search marketplace: ${errorMessage}`,
				};
			}
		},
	}),

	purchaseFromMarketplace: tool({
		description:
			"Purchase an item from external marketplace. This is a CLIENT-SIDE tool that shows a purchase confirmation UI to the user. The user must confirm the purchase by signing with their wallet. DO NOT use this without user explicitly requesting to purchase a specific item. IMPORTANT: You must provide the full item object from searchExternalMarketplace results, not just the ID.",
		inputSchema: z.object({
			itemId: z.string().describe("Marketplace item ID to purchase"),
			item: MarketplaceItemSchema.describe(
				"Full marketplace item details including name, price, image, etc. Use the item object from searchExternalMarketplace results."
			),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			item: z
				.object({
					id: z.string(),
					name: z.string(),
					price: z.number(),
				})
				.optional(),
			purchase: z
				.object({
					id: z.string(),
					signature: z.string(),
					timestamp: z.string(),
					txHash: z.string().optional(),
				})
				.optional(),
			error: z.string().optional(),
			message: z.string(),
		}),
	}),
});

export type AiTools = ReturnType<typeof createAiTools>;
