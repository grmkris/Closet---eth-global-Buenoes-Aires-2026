import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemsTable,
} from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
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

/**
 * Map file extension to MIME type for AI image processing
 */
function getMimeTypeFromExtension(extension: string): string {
	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		heic: "image/heic",
		heif: "image/heif",
		webp: "image/webp",
		gif: "image/gif",
	};
	return mimeTypes[extension] || "image/jpeg"; // Default to jpeg if unknown
}

export type ProcessClothingImageDeps = {
	db: Database;
	storage: StorageClient;
	aiClient: AiClient;
	logger: Logger;
};

export type ProcessClothingImageResult = {
	success: true;
	itemId: string;
	tagsCreated: number;
};

/**
 * Process a clothing image: analyze with AI and save results to database
 * This is pure business logic that can be called from workers, API endpoints, or tests
 */
export async function processClothingImage(
	deps: ProcessClothingImageDeps,
	job: ProcessImageJob
): Promise<ProcessClothingImageResult> {
	const { db, storage, aiClient, logger } = deps;
	const { itemId, imageKey, userId } = job;

	logger.info({ msg: "Processing image", itemId, userId });

	try {
		// 1. Update status to processing
		await db
			.update(clothingItemsTable)
			.set({ status: "processing" })
			.where(eq(clothingItemsTable.id, itemId));

		// 2. Download image from storage
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

		// Extract MIME type from file extension
		const extension = imageKey.split(".").pop()?.toLowerCase() || "";
		const mimeType = getMimeTypeFromExtension(extension);

		// 3. Get existing tags for consistency
		const existingTags = await getExistingTags(db, userId);

		// 4. Analyze image with AI
		const result = await analyzeClothingImage({
			imageData: imageBuffer,
			mimeType,
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

		throw error; // Caller (worker/API) can decide on retry logic
	}
}
