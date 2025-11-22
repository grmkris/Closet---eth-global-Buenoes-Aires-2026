import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { AnalyzeImageJob } from "@ai-stilist/queue/jobs/analyze-image-job";
import type { StorageClient } from "@ai-stilist/storage";
import {
	type AnalyzeClothingImageResult,
	analyzeClothingImageJob,
} from "../analyze-clothing-image";

export type AnalyzeImageOrchestratorDeps = {
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

/**
 * Orchestrates the complete AI analysis workflow:
 * 1. Analyze processed image with AI
 * 2. Save results to database
 * 3. Update item status to "completed"
 *
 * This is the second (final) stage in the two-stage pipeline.
 * Workers should delegate to this orchestrator to keep business logic centralized.
 */
export function analyzeImageOrchestrator(
	deps: AnalyzeImageOrchestratorDeps,
	job: AnalyzeImageJob
): Promise<AnalyzeClothingImageResult> {
	// All orchestration logic is already in analyzeClothingImageJob
	// This wrapper exists for consistency and future extensibility
	return analyzeClothingImageJob(deps, job);
}
