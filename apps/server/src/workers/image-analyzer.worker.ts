import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingItemsTable } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { AnalyzeImageJob } from "@ai-stilist/queue/jobs/analyze-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { StorageClient } from "@ai-stilist/storage";
import { analyzeClothingImageJob } from "@ai-stilist/wardrobe/analyze-clothing-image";

export type ImageAnalyzerConfig = {
	queue: QueueClient;
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

/**
 * Create and start the image analyzer worker
 * Analyzes processed images with AI (second step in pipeline)
 */
export function createImageAnalyzerWorker(config: ImageAnalyzerConfig): {
	close: () => Promise<void>;
} {
	const { queue, db, storage, aiClient, logger } = config;

	logger.info({ msg: "Starting image analyzer worker" });

	// Create worker - delegates to pure business logic
	const worker = queue.createWorker<"analyze-image">(
		"analyze-image",
		async (job: AnalyzeImageJob) =>
			analyzeClothingImageJob({ db, storage, aiClient, logger }, job),
		{
			concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS, // Analyze images concurrently
			onFailed: async (job: AnalyzeImageJob, error: Error) => {
				// This runs ONLY after all retries are exhausted
				logger.warn({
					msg: "Setting item to failed status after all AI analysis retries exhausted",
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
