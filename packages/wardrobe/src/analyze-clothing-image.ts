import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemsTable,
} from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { AnalyzeImageJob } from "@ai-stilist/queue/jobs/analyze-image-job";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import { analyzeClothingImage } from "./clothing-analyzer";
import {
	getExistingTags,
	insertClothingCategory,
	insertClothingColors,
	insertClothingTags,
} from "./wardrobe-repository";

export type AnalyzeClothingImageDeps = {
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

export type AnalyzeClothingImageResult = {
	success: true;
	itemId: string;
	tagsCreated: number;
};

/**
 * Analyze a processed clothing image with AI and save results to database
 * This runs AFTER image processing (Sharp conversion) is complete
 */
export async function analyzeClothingImageJob(
	deps: AnalyzeClothingImageDeps,
	job: AnalyzeImageJob
): Promise<AnalyzeClothingImageResult> {
	const { db, storage, aiClient, logger } = deps;
	const { itemId, processedImageKey, userId } = job;

	logger.info({ msg: "Analyzing image with AI", itemId, userId });

	try {
		// 1. Update status to analyzing
		await db
			.update(clothingItemsTable)
			.set({
				status: "analyzing",
				attemptCount: 1,
				lastAttemptAt: new Date(),
			})
			.where(eq(clothingItemsTable.id, itemId));

		// 2. Download processed image from storage
		const imageUrl = storage.getSignedUrl({
			key: processedImageKey,
			expiresIn: WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
		});

		const imageResponse = await fetch(imageUrl);
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
			);
		}

		const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

		// Convert to base64 data URL for AI analysis
		const dataUrl = `data:image/webp;base64,${imageBuffer.toString("base64")}`;

		// 3. Get existing tags for consistency
		const existingTags = await getExistingTags(db, userId);

		// 4. Analyze image with AI
		const result = await analyzeClothingImage({
			imageUrl: dataUrl,
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

			// Update item status to completed
			await tx
				.update(clothingItemsTable)
				.set({ status: "completed" })
				.where(eq(clothingItemsTable.id, itemId));
		});

		logger.info({
			msg: "Image analyzed successfully",
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
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		logger.error({
			msg: "Image analysis failed",
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
