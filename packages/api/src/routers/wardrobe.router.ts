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

const RetryFailedItemInput = z.object({
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
				status: "awaiting_upload",
			});

			context.logger.info({
				msg: "Upload URL generated",
				itemId,
				userId,
			});

			return {
				itemId,
				uploadUrl,
				status: "awaiting_upload",
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

			if (item.status !== "awaiting_upload") {
				throw new Error(
					`Item status is ${item.status}, expected awaiting_upload`
				);
			}

			// Verify file exists in S3
			const fileExists = await context.storage.exists(item.imageKey);
			if (!fileExists) {
				throw new Error(
					`File not found in storage. Upload may have failed: ${item.imageKey}`
				);
			}

			// Update status to queued
			await context.db
				.update(clothingItemsTable)
				.set({ status: "queued" })
				.where(eq(clothingItemsTable.id, itemId));

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
	 * Retry a failed item
	 * Re-queues the processing job for a failed item
	 */
	retryFailedItem: protectedProcedure
		.input(RetryFailedItemInput)
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

			if (item.status !== "failed") {
				throw new Error(
					`Item status is ${item.status}, can only retry failed items`
				);
			}

			// Verify file still exists in S3
			const fileExists = await context.storage.exists(item.imageKey);
			if (!fileExists) {
				throw new Error(
					`File not found in storage. Cannot retry processing: ${item.imageKey}`
				);
			}

			// Update status to queued and increment attempt count
			await context.db
				.update(clothingItemsTable)
				.set({
					status: "queued",
					attemptCount: sql`${clothingItemsTable.attemptCount} + 1`,
					lastAttemptAt: new Date(),
				})
				.where(eq(clothingItemsTable.id, itemId));

			// Re-queue processing job
			const job = await context.queue.addJob("process-image", {
				itemId,
				imageKey: item.imageKey,
				userId,
			});

			context.logger.info({
				msg: "Failed item retry queued",
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
						status: "awaiting_upload",
					});

					return {
						itemId,
						uploadUrl,
						status: "awaiting_upload",
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
				orderBy: (items, { desc: descFn }) => [descFn(items.createdAt)],
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
				processedImageUrl: item.processedImageKey
					? context.storage.getSignedUrl({
							key: item.processedImageKey,
							expiresIn: 3600,
						})
					: null,
				thumbnailUrl: item.thumbnailKey
					? context.storage.getSignedUrl({
							key: item.thumbnailKey,
							expiresIn: 3600,
						})
					: null,
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

			// Generate signed URLs
			const imageUrl = context.storage.getSignedUrl({
				key: item.imageKey,
				expiresIn: 3600,
			});

			const processedImageUrl = item.processedImageKey
				? context.storage.getSignedUrl({
						key: item.processedImageKey,
						expiresIn: 3600,
					})
				: null;

			const thumbnailUrl = item.thumbnailKey
				? context.storage.getSignedUrl({
						key: item.thumbnailKey,
						expiresIn: 3600,
					})
				: null;

			return {
				...item,
				imageUrl,
				processedImageUrl,
				thumbnailUrl,
			};
		}),

	/**
	 * Get all unique tags in user's wardrobe
	 * Useful for autocomplete, filtering, and consistency
	 */
	getTags: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		// Aggregate tags with counts using SQL
		const tagsResult = await context.db
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
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(
				tagsTable.id,
				tagsTable.name,
				tagTypesTable.name,
				tagTypesTable.displayName
			)
			.orderBy(desc(count(clothingItemTagsTable.itemId)));

		// Aggregate categories with counts using SQL
		const categoriesResult = await context.db
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
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(categoriesTable.id, categoriesTable.name)
			.orderBy(desc(count(clothingItemCategoriesTable.itemId)));

		// Aggregate colors with counts using SQL
		const colorsResult = await context.db
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
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(colorsTable.id, colorsTable.name, colorsTable.hexCode)
			.orderBy(desc(count(clothingItemColorsTable.itemId)));

		// Get total items count
		const totalItemsResult = await context.db
			.select({ count: count(clothingItemsTable.id).as("count") })
			.from(clothingItemsTable)
			.where(eq(clothingItemsTable.userId, userId));

		return {
			tags: tagsResult,
			categories: categoriesResult.map((c) => c.name),
			colors: colorsResult,
			totalTags: tagsResult.length,
			totalItems: totalItemsResult[0]?.count || 0,
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
