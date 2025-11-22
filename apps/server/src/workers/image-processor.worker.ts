import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingItemsTable } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { StorageClient } from "@ai-stilist/storage";
import { processImage } from "@ai-stilist/wardrobe/process-image";

export type ImageProcessorConfig = {
	queue: QueueClient;
	db: Database;
	storage: StorageClient;
	logger: Logger;
};

/**
 * Create and start the image processor worker
 * Converts images to WebP and generates thumbnails (first step in pipeline)
 * After completion, enqueues AI analysis job
 */
export function createImageProcessorWorker(config: ImageProcessorConfig): {
	close: () => Promise<void>;
} {
	const { queue, db, storage, logger } = config;

	logger.info({ msg: "Starting image processor worker" });

	// Create worker - delegates to pure business logic
	const worker = queue.createWorker<"process-image">(
		"process-image",
		async (job: ProcessImageJob) => {
			// Process image (Sharp conversion)
			const result = await processImage({ db, storage, logger }, job);

			// After successful processing, enqueue AI analysis job
			await queue.addJob("analyze-image", {
				itemId: job.itemId,
				processedImageKey: result.processedImageKey,
				userId: job.userId,
			});

			// Update status to "analyzing" (queued for AI)
			await db
				.update(clothingItemsTable)
				.set({ status: "analyzing" })
				.where(eq(clothingItemsTable.id, job.itemId));

			logger.info({
				msg: "Image processing complete, AI analysis queued",
				itemId: job.itemId,
			});

			return result;
		},
		{
			concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS, // Process images concurrently
			onFailed: async (job: ProcessImageJob, error: Error) => {
				// This runs ONLY after all retries are exhausted
				logger.warn({
					msg: "Setting item to failed status after all image processing retries exhausted",
					itemId: job.itemId,
					error: error.message,
				});

				// Update item status to failed
				await db
					.update(clothingItemsTable)
					.set({ status: "failed" })
					.where(eq(clothingItemsTable.id, job.itemId));
			},
		}
	);

	return worker;
}
