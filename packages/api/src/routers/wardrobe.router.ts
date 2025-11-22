import { and, eq } from "@ai-stilist/db/drizzle";
import { clothingAnalysis, clothingItem } from "@ai-stilist/db/schema/wardrobe";
import { API_LIMITS } from "@ai-stilist/shared/constants";
import {
	ClothingItemId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
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
			await context.db.insert(clothingItem).values({
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
					await context.db.insert(clothingItem).values({
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

		const items = await context.db.query.clothingItem.findMany({
			where: eq(clothingItem.userId, userId),
			with: {
				analysis: true,
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

			const item = await context.db.query.clothingItem.findFirst({
				where: and(
					eq(clothingItem.id, itemId),
					eq(clothingItem.userId, userId)
				),
				with: {
					analysis: true,
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

		// Get all analyses for user's items
		const analyses = await context.db
			.select({
				tags: clothingAnalysis.tags,
				category: clothingAnalysis.category,
			})
			.from(clothingAnalysis)
			.innerJoin(clothingItem, eq(clothingItem.id, clothingAnalysis.itemId))
			.where(eq(clothingItem.userId, userId));

		// Collect and count tags
		const tagCounts = new Map<string, number>();
		const categories = new Set<string>();

		for (const analysis of analyses) {
			categories.add(analysis.category);
			for (const tag of analysis.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			}
		}

		// Sort tags by frequency (most used first)
		const sortedTags = Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([tag, count]) => ({ tag, count }));

		return {
			tags: sortedTags,
			categories: Array.from(categories).sort(),
			totalTags: sortedTags.length,
			totalItems: analyses.length,
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
			const item = await context.db.query.clothingItem.findFirst({
				where: and(
					eq(clothingItem.id, itemId),
					eq(clothingItem.userId, userId)
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
				.update(clothingAnalysis)
				.set({
					tags: newTags,
					updatedAt: new Date(),
				})
				.where(eq(clothingAnalysis.itemId, itemId));

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
			const item = await context.db.query.clothingItem.findFirst({
				where: and(
					eq(clothingItem.id, itemId),
					eq(clothingItem.userId, userId)
				),
			});

			if (!item) {
				throw new Error("Item not found");
			}

			// Delete from storage
			await context.storage.delete({ key: item.imageKey });

			// Delete from DB (cascade will handle analysis)
			await context.db.delete(clothingItem).where(eq(clothingItem.id, itemId));

			context.logger.info({ msg: "Item deleted", itemId });

			return {
				success: true,
			};
		}),
};
