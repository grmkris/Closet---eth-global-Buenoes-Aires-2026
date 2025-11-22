import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingItemsTable } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { StorageClient } from "@ai-stilist/storage";
import { convertImage } from "./image-converter";

export type ProcessImageDeps = {
	db: Database;
	storage: StorageClient;
	logger: Logger;
};

export type ProcessImageResult = {
	success: true;
	itemId: string;
	processedImageKey: string;
	thumbnailKey: string;
};

/**
 * Process a clothing image: convert to WebP and generate thumbnail
 * This is the FIRST step in the two-queue pipeline
 * After completion, this enqueues an AI analysis job
 */
export async function processImage(
	deps: ProcessImageDeps,
	job: ProcessImageJob
): Promise<ProcessImageResult> {
	const { db, storage, logger } = deps;
	const { itemId, imageKey, userId } = job;

	logger.info({ msg: "Processing image with Sharp", itemId, userId });

	try {
		// 1. Update status to processing_image
		await db
			.update(clothingItemsTable)
			.set({
				status: "processing_image",
				attemptCount: 1,
				lastAttemptAt: new Date(),
			})
			.where(eq(clothingItemsTable.id, itemId));

		// 2. Download original image from storage
		const imageUrl = storage.getSignedUrl({
			key: imageKey,
			expiresIn: WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
		});

		const imageResponse = await fetch(imageUrl);
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
			);
		}

		const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

		// 3. Convert image to WebP and generate thumbnail
		logger.info({
			msg: "Converting image to WebP",
			itemId,
			bufferSize: imageBuffer.length,
		});
		const { processedBuffer, thumbnailBuffer, metadata } = await convertImage({
			inputBuffer: imageBuffer,
			targetWidth: 2048,
			thumbnailWidth: 600,
		});

		logger.info({
			msg: "Image converted successfully",
			itemId,
			inputFormat: metadata.format,
			dimensions: `${metadata.width}x${metadata.height}`,
			inputSize: metadata.size,
			processedSize: processedBuffer.length,
			thumbnailSize: thumbnailBuffer.length,
		});

		// 4. Upload processed images to storage
		const processedImageKey = `users/${userId}/clothing/${itemId}_processed.webp`;
		const thumbnailKey = `users/${userId}/clothing/${itemId}_thumb.webp`;

		await Promise.all([
			storage.upload({
				key: processedImageKey,
				data: processedBuffer,
				contentType: "image/webp",
			}),
			storage.upload({
				key: thumbnailKey,
				data: thumbnailBuffer,
				contentType: "image/webp",
			}),
		]);

		logger.info({
			msg: "Processed images uploaded",
			itemId,
			processedImageKey,
			thumbnailKey,
		});

		// 5. Update database with processed image keys
		// Status stays "processing_image" - will be updated to "analyzing" when AI job is enqueued
		await db
			.update(clothingItemsTable)
			.set({
				processedImageKey,
				thumbnailKey,
			})
			.where(eq(clothingItemsTable.id, itemId));

		logger.info({
			msg: "Image processing completed successfully",
			itemId,
		});

		return {
			success: true,
			itemId,
			processedImageKey,
			thumbnailKey,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		logger.error({
			msg: "Image processing failed",
			itemId,
			error: errorMessage,
			stack: errorStack,
		});

		// Store error details
		// NOTE: Do NOT set status to "failed" here - let BullMQ retry
		// Status will be set to "failed" only after all retries are exhausted
		await db
			.update(clothingItemsTable)
			.set({
				errorDetails: JSON.stringify({
					error: errorMessage,
					stack: errorStack,
					timestamp: new Date().toISOString(),
				}),
				lastAttemptAt: new Date(),
			})
			.where(eq(clothingItemsTable.id, itemId));

		throw error; // Let BullMQ handle retries
	}
}
