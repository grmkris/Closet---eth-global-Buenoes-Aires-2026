import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingItemsTable } from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import type { StorageClient } from "@ai-stilist/storage";
import { type ProcessImageResult, processImage } from "../process-image";

export type ProcessImageOrchestratorDeps = {
	db: Database;
	storage: StorageClient;
	logger: Logger;
	queue: QueueClient;
};

/**
 * Orchestrates the complete image processing workflow:
 * 1. Process image with Sharp (convert to WebP, generate thumbnail)
 * 2. Enqueue AI analysis job for the processed image
 * 3. Update item status to "analyzing"
 *
 * This is the first stage in the two-stage pipeline.
 * Workers should delegate to this orchestrator to keep business logic centralized.
 */
export async function processImageOrchestrator(
	deps: ProcessImageOrchestratorDeps,
	job: ProcessImageJob
): Promise<ProcessImageResult> {
	const { db, storage, logger, queue } = deps;

	// Step 1: Process image (pure business logic)
	const result = await processImage({ db, storage, logger }, job);

	// Step 2: Chain to AI analysis (pipeline orchestration)
	await queue.addJob("analyze-image", {
		itemId: job.itemId,
		processedImageKey: result.processedImageKey,
		userId: job.userId,
	});

	// Step 3: Update status to "analyzing" (pipeline orchestration)
	await db
		.update(clothingItemsTable)
		.set({ status: "analyzing" })
		.where(eq(clothingItemsTable.id, job.itemId));

	logger.info({
		msg: "Image processing complete, AI analysis queued",
		itemId: job.itemId,
	});

	return result;
}
