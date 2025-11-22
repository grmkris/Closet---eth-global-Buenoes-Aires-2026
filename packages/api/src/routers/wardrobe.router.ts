import { and, asc, eq, sql } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemsTablesTable,
	clothingItemsTableTagsTable,
	tagsTable,
	tagTypesTable,
} from "@ai-stilist/db/schema/wardrobe";
import { API_LIMITS } from "@ai-stilist/shared/constants";
import {
	ClothingItemId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
import { insertClothingTags } from "@ai-stilist/wardrobe/wardrobe-lookups";
import { z } from "zod";
import { protectedProcedure } from "../index";

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

const UpdateTagsInput = z.object({
	itemId: ClothingItemId,
	tags: z.array(z.string()),
	append: z.boolean().default(false), // false = replace, true = append to existing
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
			const itemId = typeIdGenerator("clothingItemsTable");

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
					const itemId = typeIdGenerator("clothingItemsTable");

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
	 * Get user's wardrobe items with analysis
	 */
	getItems: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		const items = await context.db.query.clothingItemsTable.findMany({
			where: eq(clothingItemsTable.userId, userId),
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
					orderBy: (colors, { asc }) => [asc(colors.order)],
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
		const itemsWithUrls = items.map((item) => ({
			...item,
			imageUrl: context.storage.getSignedUrl({
				key: item.imageKey,
				expiresIn: 3600,
			}),
		}));

		return {
			items: itemsWithUrls,
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
						orderBy: (colors, { asc }) => [asc(colors.order)],
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
			.innerJoin(clothingItemsTable, eq(clothingItemsTable.id, clothingItemTagsTable.itemId))
			.where(eq(clothingItemsTable.userId, userId))
			.groupBy(tagsTable.id, tagsTable.name, tagTypesTable.name, tagTypesTable.displayName)
			.orderBy(sql`count(*) desc`);

		// Get categories
		const categoryRecords = await context.db.query.clothingItemCategoriesTable.findMany(
			{
				where: eq(clothingItemsTable.userId, userId),
				with: {
					category: true,
					item: true,
				},
			}
		);

		const categories = [
			...new Set(categoryRecords.map((c) => c.category.name)),
		].sort();

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
	 * Update item's tags (user can add/remove tags)
	 */
	updateTags: protectedProcedure
		.input(UpdateTagsInput)
		.handler(async ({ input, context }) => {
			const { itemId, tags, append } = input;
			const userId = UserId.parse(context.session.user.id);

			// Verify item belongs to user and get current analysis
			const item = await context.db.query.clothingItemsTable.findFirst({
				where: and(
					eq(clothingItemsTable.id, itemId),
					eq(clothingItemsTable.userId, userId)
				),
				with: {
					analysis: true,
				},
			});

			if (!item) {
				throw new Error("Item not found");
			}

			if (!item.analysis) {
				throw new Error("Item has not been analyzed yet");
			}

			// Calculate new tags
			let newTags = tags;
			if (append && item.analysis) {
				// Merge with existing tags, removing duplicates
				newTags = [...new Set([...item.analysis.tags, ...tags])];
			}

			// Update analysis
			await context.db
				.update(clothingAnalysesTable)
				.set({
					tags: newTags,
					updatedAt: new Date(),
				})
				.where(eq(clothingAnalysesTable.itemId, itemId));

			context.logger.info({
				msg: "Tags updated",
				itemId,
				tagCount: newTags.length,
				append,
			});

			return {
				success: true,
				tags: newTags,
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
			await context.db.delete(clothingItemsTable).where(eq(clothingItemsTable.id, itemId));

			context.logger.info({ msg: "Item deleted", itemId });

			return {
				success: true,
			};
		}),
};
