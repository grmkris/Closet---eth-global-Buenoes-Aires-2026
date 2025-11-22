import { and, eq, ilike, inArray, or, sql } from "@ai-stilist/db/drizzle";
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
import { API_LIMITS } from "@ai-stilist/shared/constants";
import {
	ClothingItemId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
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
	status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
});

const DeleteItemInput = z.object({
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

			// Queue processing job
			const job = await context.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			context.logger.info({
				msg: "Image upload initiated",
				itemId,
				userId,
				jobId: job.jobId,
			});

			return {
				itemId,
				uploadUrl,
				status: "pending",
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

					// Queue processing job
					const job = await context.queue.addJob("process-image", {
						itemId,
						imageKey,
						userId,
					});

					return {
						itemId,
						uploadUrl,
						status: "pending",
						jobId: job.jobId,
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

		// Get tag counts for user's items using JOIN and GROUP BY
		const tagStats = await context.db
			.select({
				tagId: tagsTable.id,
				tagName: tagsTable.name,
				tagType: tagTypesTable.name,
				tagTypeDisplay: tagTypesTable.displayName,
				count: sql<number>`count(*)::int`.as("count"),
			})
			.from(clothingItemTagsTable)
			.innerJoin(tagsTable, eq(tagsTable.id, clothingItemTagsTable.tagId))
			.innerJoin(tagTypesTable, eq(tagTypesTable.id, tagsTable.typeId))
			.innerJoin(
				clothingItemsTable,
				eq(clothingItemsTable.id, clothingItemTagsTable.itemId)
			)
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(
				tagsTable.id,
				tagsTable.name,
				tagTypesTable.name,
				tagTypesTable.displayName
			)
			.orderBy(sql`count(*) desc`);

		// Get categories with counts using JOIN and GROUP BY
		const categoryStats = await context.db
			.select({
				categoryName: categoriesTable.name,
				count: sql<number>`count(*)::int`.as("count"),
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
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(categoriesTable.name)
			.orderBy(sql`count(*) desc`);

		const categories = categoryStats.map((c) => c.categoryName);

		// Get total item count
		const itemCount = await context.db
			.select({ count: sql<number>`count(*)::int` })
			.from(clothingItemsTable)
			.where(eq(clothingItemsTable.userId, userId));

		return {
			tags: tagStats.map((t) => ({
				tag: t.tagName,
				count: t.count,
				type: t.tagType,
				typeDisplay: t.tagTypeDisplay,
			})),
			categories,
			totalTags: tagStats.length,
			totalItems: itemCount[0]?.count || 0,
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
