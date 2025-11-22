import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemsTable,
} from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { analyzeClothingImage } from "@ai-stilist/wardrobe/clothing-analyzer";
import {
	getExistingTags,
	insertClothingCategory,
	insertClothingColors,
	insertClothingTags,
} from "@ai-stilist/wardrobe/wardrobe-repository";

export type ImageProcessorConfig = {
	queue: QueueClient;
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

/**
 * Create and start the image processor worker
 * Processes images and extracts flexible tags using AI
 */
export function createImageProcessorWorker(
	config: ImageProcessorConfig
): ReturnType<QueueClient["createWorker"]> {
	const { queue, db, storage, aiClient, logger } = config;

	logger.info({ msg: "Starting image processor worker" });

	// Create worker
	const worker = queue.createWorker<"process-image">(
		"process-image",
		async (job: ProcessImageJob) => {
			const { itemId, imageKey, userId } = job;

			logger.info({ msg: "Processing image", itemId, userId });

			try {
				// 1. Update status to processing
				await db
					.update(clothingItemsTable)
					.set({ status: "processing" })
					.where(eq(clothingItemsTable.id, itemId));

				// 2. Generate signed URL for AI analysis
				const imageUrl = storage.getSignedUrl({
					key: imageKey,
					expiresIn: WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
				});

				// 3. Get existing tags for consistency
				const existingTags = await getExistingTags(db, userId);

				// 4. Analyze image with AI
				const result = await analyzeClothingImage({
					imageUrl,
					aiClient,
					logger,
					existingTags: existingTags.length > 0 ? existingTags : undefined,
				});

				const { analysis, modelVersion, tokensUsed, durationMs } = result;

				// 5. Save analysis to database
				await db.transaction(async (tx) => {
					// Save analysis metadata
					await tx.insert(clothingAnalysesTable).values({
						id: typeIdGenerator("clothingAnalysis"),
						itemId,
						modelVersion,
					});

					// Insert normalized category, colors, and tags
					await insertClothingCategory(tx, itemId, analysis.category);
					await insertClothingColors(tx, itemId, analysis.colors);
					await insertClothingTags(tx, itemId, analysis.tags, "ai");

					// Update item status to ready
					await tx
						.update(clothingItemsTable)
						.set({ status: "ready" })
						.where(eq(clothingItemsTable.id, itemId));
				});

				logger.info({
					msg: "Image processed successfully",
					itemId,
					durationMs,
					tokensUsed,
					tagCount: analysis.tags.length,
					category: analysis.category,
				});

				return {
					success: true,
					itemId,
					tagsCreated: analysis.tags.length,
				};
			} catch (error) {
				logger.error({
					msg: "Image processing failed",
					itemId,
					error,
				});

				// Update item status to failed
				await db
					.update(clothingItemsTable)
					.set({ status: "failed" })
					.where(eq(clothingItemsTable.id, itemId));

				throw error; // BullMQ will retry
			}
		},
		{
			concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS, // Process images concurrently
		}
	);

	return worker;
}
