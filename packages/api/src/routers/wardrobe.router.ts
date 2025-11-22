import {
	clothingItem,
	clothingMetadata,
	type SelectClothingItem,
} from "@ai-stilist/db/schema/wardrobe";
import { ClothingItemId, typeIdGenerator } from "@ai-stilist/shared/typeid";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

// Input schemas
const RequestUploadInput = z.object({
	contentType: z.string(),
	extension: z.string(),
});

const RequestBatchUploadInput = z.object({
	count: z.number().min(1).max(50),
	contentType: z.string(),
	extension: z.string(),
});

const ConfirmUploadInput = z.object({
	itemId: ClothingItemId,
});

const BatchConfirmUploadInput = z.object({
	itemIds: z.array(ClothingItemId).min(1).max(50),
});

const GetItemsInput = z.object({
	category: z
		.enum(["top", "bottom", "shoes", "outerwear", "accessory"])
		.optional(),
	status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
});

const GetItemInput = z.object({
	itemId: ClothingItemId,
});

const UpdateMetadataInput = z.object({
	itemId: ClothingItemId,
	updates: z.object({
		userNotes: z.string().optional(),
		styleTags: z.array(z.string()).optional(),
		occasions: z.array(z.string()).optional(),
	}),
});

const DeleteItemInput = z.object({
	itemId: ClothingItemId,
});

export const wardrobeRouter = {
	/**
	 * Request a pre-signed URL for uploading a single image
	 */
	requestUpload: protectedProcedure
		.input(RequestUploadInput)
		.handler(async ({ input, context }) => {
			const { contentType, extension } = input;
			const userId = context.session.user.id;

			// Generate item ID
			const itemId = typeIdGenerator("clothingItem");

			// Generate storage key
			const imageKey = `users/${userId}/clothing/originals/${itemId}.${extension}`;

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

			context.logger.info({ msg: "Upload URL generated", itemId, userId });

			return {
				itemId,
				uploadUrl,
				imageKey,
			};
		}),

	/**
	 * Request multiple pre-signed URLs for batch upload
	 */
	requestBatchUpload: protectedProcedure
		.input(RequestBatchUploadInput)
		.handler(async ({ input, context }) => {
			const { count, contentType, extension } = input;
			const userId = context.session.user.id;

			// Generate items and keys
			const items = Array.from({ length: count }, () => {
				const itemId = typeIdGenerator("clothingItem");
				const imageKey = `users/${userId}/clothing/originals/${itemId}.${extension}`;
				return { itemId, imageKey };
			});

			// Generate pre-signed URLs
			const uploads = context.storage.getBatchUploadUrls(
				items.map((item) => ({
					key: item.imageKey,
					contentType,
				})),
				3600 // 1 hour
			);

			// Create DB records with pending status
			await context.db.insert(clothingItem).values(
				items.map((item) => ({
					id: item.itemId,
					userId,
					imageKey: item.imageKey,
					status: "pending" as const,
				}))
			);

			context.logger.info({
				msg: "Batch upload URLs generated",
				count,
				userId,
			});

			return {
				uploads: items.map((item, index) => ({
					itemId: item.itemId,
					uploadUrl: uploads[index].uploadUrl,
					imageKey: item.imageKey,
				})),
			};
		}),

	/**
	 * Confirm upload complete and enqueue processing
	 */
	confirmUpload: protectedProcedure
		.input(ConfirmUploadInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = context.session.user.id;

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

			// Update status to processing
			await context.db
				.update(clothingItem)
				.set({ status: "processing" })
				.where(eq(clothingItem.id, itemId));

			// Enqueue processing job
			const job = await context.queue.addJob("process-image", {
				itemId,
				imageKey: item.imageKey,
				userId,
			});

			// Save job ID
			await context.db
				.update(clothingItem)
				.set({ processingJobId: job.jobId })
				.where(eq(clothingItem.id, itemId));

			context.logger.info({
				msg: "Upload confirmed, processing enqueued",
				itemId,
				jobId: job.jobId,
			});

			return {
				itemId,
				status: "processing",
				jobId: job.jobId,
			};
		}),

	/**
	 * Batch confirm uploads
	 */
	batchConfirmUpload: protectedProcedure
		.input(BatchConfirmUploadInput)
		.handler(async ({ input, context }) => {
			const { itemIds } = input;
			const userId = context.session.user.id;

			// Verify all items belong to user
			const items = await context.db.query.clothingItem.findMany({
				where: and(
					eq(clothingItem.userId, userId),
					// @ts-expect-error - drizzle types
					eq(clothingItem.id, itemIds)
				),
			});

			if (items.length !== itemIds.length) {
				throw new Error("Some items not found");
			}

			// Update all to processing
			for (const item of items) {
				await context.db
					.update(clothingItem)
					.set({ status: "processing" })
					.where(eq(clothingItem.id, item.id));

				// Enqueue processing job
				const job = await context.queue.addJob("process-image", {
					itemId: item.id,
					imageKey: item.imageKey,
					userId,
				});

				// Save job ID
				await context.db
					.update(clothingItem)
					.set({ processingJobId: job.jobId })
					.where(eq(clothingItem.id, item.id));
			}

			context.logger.info({
				msg: "Batch upload confirmed",
				count: items.length,
				userId,
			});

			return {
				processed: items.length,
			};
		}),

	/**
	 * Get user's wardrobe items
	 */
	getItems: protectedProcedure
		.input(GetItemsInput)
		.handler(async ({ input, context }) => {
			const { category, status } = input;
			const userId = context.session.user.id;

			const conditions = [eq(clothingItem.userId, userId)];

			if (status) {
				conditions.push(eq(clothingItem.status, status));
			}

			const items = await context.db.query.clothingItem.findMany({
				where: and(...conditions),
				with: {
					metadata: true,
				},
			});

			// Filter by category if specified
			const filteredItems = category
				? items.filter((item) => item.metadata?.category === category)
				: items;

			// Generate signed URLs for images
			const itemsWithUrls = filteredItems.map((item) => ({
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
	 * Get single item with full metadata
	 */
	getItem: protectedProcedure
		.input(GetItemInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = context.session.user.id;

			const item = await context.db.query.clothingItem.findFirst({
				where: and(
					eq(clothingItem.id, itemId),
					eq(clothingItem.userId, userId)
				),
				with: {
					metadata: true,
					embedding: true,
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
	 * Update item metadata (user edits)
	 */
	updateMetadata: protectedProcedure
		.input(UpdateMetadataInput)
		.handler(async ({ input, context }) => {
			const { itemId, updates } = input;
			const userId = context.session.user.id;

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

			// Update metadata
			await context.db
				.update(clothingMetadata)
				.set({
					userNotes: updates.userNotes,
					styleTags: updates.styleTags,
					occasions: updates.occasions,
					updatedAt: new Date(),
				})
				.where(eq(clothingMetadata.itemId, itemId));

			context.logger.info({ msg: "Metadata updated", itemId });

			return {
				success: true,
			};
		}),

	/**
	 * Delete item
	 */
	deleteItem: protectedProcedure
		.input(DeleteItemInput)
		.handler(async ({ input, context }) => {
			const { itemId } = input;
			const userId = context.session.user.id;

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

			// Delete from DB (cascade will handle metadata and embeddings)
			await context.db
				.delete(clothingItem)
				.where(eq(clothingItem.id, itemId));

			context.logger.info({ msg: "Item deleted", itemId });

			return {
				success: true,
			};
		}),
};
