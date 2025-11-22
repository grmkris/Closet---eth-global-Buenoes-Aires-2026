import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { StorageClient } from "@ai-stilist/storage";
import { processClothingImage } from "@ai-stilist/wardrobe/process-clothing-image";

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

	// Create worker - delegates to pure business logic
	const worker = queue.createWorker<"process-image">(
		"process-image",
		async (job: ProcessImageJob) => {
			return processClothingImage(
				{ db, storage, aiClient, logger },
				job
			);
		},
		{
			concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS, // Process images concurrently
		}
	);

	return worker;
}
