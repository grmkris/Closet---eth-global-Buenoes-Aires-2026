import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { clothingItem, clothingMetadata } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { analyzeClothingImage } from "@ai-stilist/wardrobe/clothing-analyzer";
import { eq } from "drizzle-orm";

export type ImageProcessorConfig = {
	queue: QueueClient;
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

/**
 * Create and start the image processor worker
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
				// 1. Generate signed URL for image
				const imageUrl = storage.getSignedUrl({
					key: imageKey,
					expiresIn: WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
				});

				// 2. Analyze image with AI
				const result = await analyzeClothingImage({
					imageUrl,
					aiClient,
					logger,
				});

				const { metadata, tokensUsed, durationMs } = result;

				// 3. Save metadata to database
				await db.transaction(async (tx) => {
					// Save metadata
					await tx.insert(clothingMetadata).values({
						id: typeIdGenerator("clothingMetadata"),
						itemId,
						category: metadata.category,
						subcategory: metadata.subcategory,
						colors: metadata.colors,
						primaryColor: metadata.primaryColor,
						patterns: metadata.patterns,
						formality: metadata.formality,
						seasons: metadata.seasons,
						occasions: metadata.occasions,
						fit: metadata.fit,
						brand: null,
						material: metadata.material,
						styleTags: metadata.styleTags,
						userNotes: null,
						aiConfidence: metadata.confidence,
					});

					// Update item status to ready
					await tx
						.update(clothingItem)
						.set({ status: "ready" })
						.where(eq(clothingItem.id, itemId));
				});

				logger.info({
					msg: "Image processed successfully",
					itemId,
					durationMs,
					tokensUsed,
					confidence: metadata.confidence,
				});

				return {
					success: true,
					itemId,
				};
			} catch (error) {
				logger.error({
					msg: "Image processing failed",
					itemId,
					error,
				});

				// Update item status to failed
				await db
					.update(clothingItem)
					.set({ status: "failed" })
					.where(eq(clothingItem.id, itemId));

				throw error; // BullMQ will retry
			}
		},
		{
			concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS, // Process images concurrently
		}
	);

	return worker;
}
