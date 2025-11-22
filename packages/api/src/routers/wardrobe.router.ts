import { and, eq, ilike, inArray, or, sql } from "@ai-stilist/db/drizzle";
import {
	categoriesTable,
	clothingItemCategoriesTable,
	clothingItemColorsTable,
	clothingItemsTable,
	clothingItemTagsTable,
	colorsTable,
	tagsTable,
} from "@ai-stilist/db/schema/wardrobe";
import { API_LIMITS } from "@ai-stilist/shared/constants";
import {
	ClothingItemId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
import { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import {
	getAllCategories,
	getAllColors,
	getAllTags,
	getAllTagTypes,
} from "@ai-stilist/wardrobe/wardrobe-repository";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

// Input schemas
const UploadInput = z.object({
	contentType: z.string(),
	fileName: z.string(),
});

const BatchUploadInput = z.object({
	files: z.array(UploadInput).min(1).max(API_LIMITS.MAX_BATCH_UPLOAD),
});

const GetItemInput = z.object({
	itemId: ClothingItemId,
});

const GetItemsInput = z.object({
	limit: z
		.number()
		.int()
		.min(1)
		.max(API_LIMITS.MAX_ITEMS_PER_PAGE)
		.default(API_LIMITS.DEFAULT_ITEMS_PER_PAGE),
	offset: z.number().int().min(0).default(0),
	search: z.string().max(API_LIMITS.MAX_SEARCH_LENGTH).trim().optional(),
	categories: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	colors: z.array(z.string()).optional(),
	status: ClothingItemStatus.optional(),
});

const DeleteItemInput = z.object({
	itemId: ClothingItemId,
});

const ConfirmUploadInput = z.object({
	itemId: ClothingItemId,
});

export const wardrobeRouter = {
	/**
	 * Upload a single image
	 */
	upload: protectedProcedure
		.input(UploadInput)
		.handler(async ({ input, context }) => {
			const { contentType, fileName } = input;
			const userId = UserId.parse(context.session.user.id);

			// Generate item ID
			const itemId = typeIdGenerator("clothingItem");

			// Generate storage key (use fileName extension)
			const extension = fileName.split(".").pop() || "jpg";
			const imageKey = `users/${userId}/clothing/${itemId}.${extension}`;

			// Generate pre-signed upload URL
			const uploadUrl = context.storage.getUploadUrl({
				key: imageKey,
				contentType,
				expiresIn: 3600, // 1 hour
			});

			// Create DB record with pending status
			await context.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			context.logger.info({
				msg: "Upload URL generated",
				itemId,
				userId,
			});

			return {
				itemId,
				uploadUrl,
				status: "pending",
			};
		}),

	/**
	 * Confirm upload and start processing
	 * Called by client after successfully uploading to presigned URL
	 */
	confirmUpload: protectedProcedure
		.input(ConfirmUploadInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = UserId.parse(context.session.user.id);

			// Verify item exists and belongs to user
			const item = await context.db.query.clothingItemsTable.findFirst({
				where: and(
					eq(clothingItemsTable.id, itemId),
					eq(clothingItemsTable.userId, userId)
				),
			});

			if (!item) {
				throw new Error("Item not found");
			}

			if (item.status !== "pending") {
				throw new Error(`Item status is ${item.status}, expected pending`);
			}

			// Queue processing job
			const job = await context.queue.addJob("process-image", {
				itemId,
				imageKey: item.imageKey,
				userId,
			});

			context.logger.info({
				msg: "Upload confirmed, processing started",
				itemId,
				userId,
				jobId: job.jobId,
			});

			return {
				success: true,
				jobId: job.jobId,
			};
		}),

	/**
	 * Batch upload multiple images
	 */
	batchUpload: protectedProcedure
		.input(BatchUploadInput)
		.handler(async ({ input, context }) => {
			const { files } = input;
			const userId = UserId.parse(context.session.user.id);

			const results = await Promise.all(
				files.map(async (file) => {
					// Generate item ID
					const itemId = typeIdGenerator("clothingItem");

					// Generate storage key
					const extension = file.fileName.split(".").pop() || "jpg";
					const imageKey = `users/${userId}/clothing/${itemId}.${extension}`;

					// Generate pre-signed upload URL
					const uploadUrl = context.storage.getUploadUrl({
						key: imageKey,
						contentType: file.contentType,
						expiresIn: 3600,
					});

					// Create DB record
					await context.db.insert(clothingItemsTable).values({
						id: itemId,
						userId,
						imageKey,
						status: "pending",
					});

					return {
						itemId,
						uploadUrl,
						status: "pending",
					};
				})
			);

			context.logger.info({
				msg: "Batch upload initiated",
				count: results.length,
				userId,
			});

			return {
				items: results,
			};
		}),

	/**
	 * Get user's wardrobe items with analysis (paginated with filtering)
	 */
	getItems: protectedProcedure
		.input(GetItemsInput)
		.handler(async ({ input, context }) => {
			const { limit, offset, search, categories, tags, colors, status } = input;
			const userId = UserId.parse(context.session.user.id);

			// Build WHERE conditions
			const conditions = [eq(clothingItemsTable.userId, userId)];

			// Status filter
			if (status) {
				conditions.push(eq(clothingItemsTable.status, status));
			}

			// Category filter - use subquery
			if (categories?.length) {
				const categorySubquery = context.db
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
				const tagSubquery = context.db
					.select({ itemId: clothingItemTagsTable.itemId })
					.from(clothingItemTagsTable)
					.innerJoin(tagsTable, eq(tagsTable.id, clothingItemTagsTable.tagId))
					.where(inArray(tagsTable.name, tags));

				conditions.push(inArray(clothingItemsTable.id, sql`(${tagSubquery})`));
			}

			// Color filter - use subquery
			if (colors?.length) {
				const colorSubquery = context.db
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

			// Search filter - search in categories and tags
			if (search) {
				const searchPattern = `%${search.toLowerCase()}%`;

				const categorySearchSubquery = context.db
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

				const tagSearchSubquery = context.db
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
			const itemsDb = await context.db.query.clothingItemsTable.findMany({
				where: and(...conditions),
				limit,
				offset,
				orderBy: (items, { desc }) => [desc(items.createdAt)],
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

			// Generate signed URLs for images
			const itemsWithUrls = itemsDb.map((item) => ({
				...item,
				imageUrl: context.storage.getSignedUrl({
					key: item.imageKey,
					expiresIn: 3600,
				}),
			}));

			// Get total count with same filters
			const totalResult = await context.db
				.select({ count: sql<number>`count(*)::int` })
				.from(clothingItemsTable)
				.where(and(...conditions));

			const total = totalResult[0]?.count || 0;

			return {
				items: itemsWithUrls,
				pagination: {
					limit,
					offset,
					total,
					hasMore: offset + limit < total,
				},
			};
		}),

	/**
	 * Get single item with analysis
	 */
	getItem: protectedProcedure
		.input(GetItemInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = UserId.parse(context.session.user.id);

			const item = await context.db.query.clothingItemsTable.findFirst({
				where: and(
					eq(clothingItemsTable.id, itemId),
					eq(clothingItemsTable.userId, userId)
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
				throw new Error("Item not found");
			}

			// Generate signed URL
			const imageUrl = context.storage.getSignedUrl({
				key: item.imageKey,
				expiresIn: 3600,
			});

			return {
				...item,
				imageUrl,
			};
		}),

	/**
	 * Get all unique tags in user's wardrobe
	 * Useful for autocomplete, filtering, and consistency
	 */
	getTags: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		// Use Drizzle relational queries to fetch all items with relations
		const items = await context.db.query.clothingItemsTable.findMany({
			where: eq(clothingItemsTable.userId, userId),
			with: {
				tags: {
					with: {
						tag: {
							with: {
								type: true,
							},
						},
					},
				},
				categories: {
					with: {
						category: true,
					},
				},
				colors: {
					with: {
						color: true,
					},
				},
			},
		});

		// Aggregate tag statistics in JavaScript
		const tagCountMap = new Map<
			string,
			{ tag: string; type: string; typeDisplay: string; count: number }
		>();

		for (const item of items) {
			for (const { tag } of item.tags) {
				const key = tag.id;
				const existing = tagCountMap.get(key);
				if (existing) {
					existing.count += 1;
				} else {
					tagCountMap.set(key, {
						tag: tag.name,
						type: tag.type.name,
						typeDisplay: tag.type.displayName,
						count: 1,
					});
				}
			}
		}

		// Sort tags by count descending
		const tags = Array.from(tagCountMap.values()).sort(
			(a, b) => b.count - a.count
		);

		// Aggregate category statistics
		const categoryCountMap = new Map<string, number>();

		for (const item of items) {
			for (const { category } of item.categories) {
				const count = categoryCountMap.get(category.name) || 0;
				categoryCountMap.set(category.name, count + 1);
			}
		}

		// Sort categories by count descending
		const categories = Array.from(categoryCountMap.keys()).sort(
			(a, b) => (categoryCountMap.get(b) || 0) - (categoryCountMap.get(a) || 0)
		);

		// Aggregate color statistics
		const colorCountMap = new Map<
			string,
			{ name: string; hexCode: string | null; count: number }
		>();

		for (const item of items) {
			for (const { color } of item.colors) {
				const key = color.id;
				const existing = colorCountMap.get(key);
				if (existing) {
					existing.count += 1;
				} else {
					colorCountMap.set(key, {
						name: color.name,
						hexCode: color.hexCode,
						count: 1,
					});
				}
			}
		}

		// Sort colors by count descending
		const colors = Array.from(colorCountMap.values()).sort(
			(a, b) => b.count - a.count
		);

		return {
			tags,
			categories,
			colors,
			totalTags: tags.length,
			totalItems: items.length,
		};
	}),

	/**
	 * Delete item
	 */
	deleteItem: protectedProcedure
		.input(DeleteItemInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = UserId.parse(context.session.user.id);

			// Verify item belongs to user
			const item = await context.db.query.clothingItemsTable.findFirst({
				where: and(
					eq(clothingItemsTable.id, itemId),
					eq(clothingItemsTable.userId, userId)
				),
			});

			if (!item) {
				throw new Error("Item not found");
			}

			// Delete from storage
			await context.storage.delete({ key: item.imageKey });

			// Delete from DB (cascade will handle analysis)
			await context.db
				.delete(clothingItemsTable)
				.where(eq(clothingItemsTable.id, itemId));

			context.logger.info({ msg: "Item deleted", itemId });

			return {
				success: true,
			};
		}),

	// ============================================================================
	// READ-ONLY ENDPOINTS FOR TAGS, CATEGORIES, COLORS
	// ============================================================================

	/**
	 * Get all tags (read-only, for autocomplete/filtering)
	 */
	listTags: publicProcedure.handler(async ({ context }) => {
		const tags = await getAllTags(context.db);
		return { tags };
	}),

	/**
	 * Get all categories (read-only)
	 */
	listCategories: publicProcedure.handler(async ({ context }) => {
		const categories = await getAllCategories(context.db);
		return { categories };
	}),

	/**
	 * Get all colors (read-only)
	 */
	listColors: publicProcedure.handler(async ({ context }) => {
		const colors = await getAllColors(context.db);
		return { colors };
	}),

	/**
	 * Get all tag types (read-only)
	 */
	listTagTypes: publicProcedure.handler(async ({ context }) => {
		const tagTypes = await getAllTagTypes(context.db);
		return { tagTypes };
	}),
};
