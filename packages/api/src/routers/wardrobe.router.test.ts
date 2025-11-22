import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import type { Database } from "@ai-stilist/db";
import { eq } from "@ai-stilist/db/drizzle";
import {
	clothingAnalysesTable,
	clothingItemsTable,
} from "@ai-stilist/db/schema/wardrobe";
import type { AnalyzeImageJob } from "@ai-stilist/queue/jobs/analyze-image-job";
import type { ProcessImageJob } from "@ai-stilist/queue/jobs/process-image-job";
import { NUMERIC_CONSTANTS, WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import {
	type Context,
	createTestContext,
	createTestSetup,
	type TestSetup,
} from "@ai-stilist/test-utils/test-setup";
import {
	analyzeImageOrchestrator,
	processImageOrchestrator,
} from "@ai-stilist/wardrobe/orchestrators";
import { call } from "@orpc/server";
import { wardrobeRouter } from "./wardrobe.router";

// Test data directory with real images (relative from repo root)
const TEST_DATA_DIR = path.join(process.cwd(), "_data");
const TEST_IMAGES = {
	shirt: path.join(TEST_DATA_DIR, "ANDRAŽ OMARA", "IMG_4055.jpg"),
	pants: path.join(TEST_DATA_DIR, "ANDRAŽ OMARA", "IMG_4056.jpg"),
	dress: path.join(TEST_DATA_DIR, "IVONA OMARA", "IMG_9315.JPG"),
};

// Test timeout constants
const AI_PROCESSING_TIMEOUT_MS = 60_000; // 60s for single AI processing
const MULTIPLE_UPLOADS_TIMEOUT_MS = 120_000; // 120s for multiple uploads
const TEST_TIMEOUT_MS = 10_000;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load a real test image from the _data directory
 */
async function loadTestImage(imagePath: string): Promise<Buffer> {
	try {
		return await fs.readFile(imagePath);
	} catch (error) {
		throw new Error(
			`Failed to load test image at ${imagePath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Wait for image processing to complete
 * Polls the database until status changes from 'pending'/'processing' to 'ready'/'failed'
 */
async function waitForProcessing(
	db: Database,
	itemId: ClothingItemId,
	maxWaitMs = 30_000
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitMs) {
		const item = await db.query.clothingItemsTable.findFirst({
			where: eq(clothingItemsTable.id, itemId),
		});

		if (!item) {
			throw new Error(`Item ${itemId} not found`);
		}

		if (item.status === "completed") {
			return; // Success!
		}

		if (item.status === "failed") {
			throw new Error(`Image processing failed for item ${itemId}`);
		}

		// Wait 1 second before checking again
		await new Promise((resolve) =>
			setTimeout(resolve, NUMERIC_CONSTANTS.MAX_DELAY)
		);
	}

	throw new Error(`Processing timeout after ${maxWaitMs}ms for item ${itemId}`);
}

/**
 * Complete upload and processing flow with real AI
 * Returns the itemId after successful processing
 */
async function uploadAndProcessImage(
	context: Context,
	imagePath: string
): Promise<ClothingItemId> {
	const imageBuffer = await loadTestImage(imagePath);
	const fileName = path.basename(imagePath);

	let contentType: string;
	if (fileName.endsWith(".JPG") || fileName.endsWith(".jpg")) {
		contentType = "image/jpeg";
	} else if (fileName.endsWith(".png")) {
		contentType = "image/png";
	} else {
		contentType = "image/jpeg"; // default
	}

	// Step 1: Get presigned upload URL
	const uploadResult = await call(
		wardrobeRouter.upload,
		{
			contentType,
			fileName,
		},
		{ context }
	);

	// Step 2: Upload image to storage using presigned URL
	const uploadResponse = await fetch(uploadResult.uploadUrl, {
		method: "PUT",
		body: imageBuffer,
		headers: {
			"Content-Type": contentType,
		},
	});

	if (!uploadResponse.ok) {
		throw new Error(
			`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
		);
	}

	// Step 3: Confirm upload to start processing
	await call(
		wardrobeRouter.confirmUpload,
		{ itemId: uploadResult.itemId },
		{ context }
	);

	// Step 4: Wait for background processing to complete
	await waitForProcessing(context.db, uploadResult.itemId);

	return uploadResult.itemId;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Wardrobe Router", () => {
	let setup: TestSetup;
	let context: Context;
	let _workers: { close: () => Promise<void> }[];

	beforeAll(async () => {
		// Create test environment with real AI
		setup = await createTestSetup();
		context = await createTestContext({
			token: setup.users.authenticated.token,
			testSetup: setup,
		});

		// Start TWO workers using orchestrators (same logic as production)
		const imageProcessorWorker = setup.deps.queue.createWorker<"process-image">(
			"process-image",
			async (job: ProcessImageJob) =>
				processImageOrchestrator(
					{
						db: setup.deps.db,
						storage: setup.deps.storage,
						logger: setup.deps.logger,
						queue: setup.deps.queue,
					},
					job
				),
			{
				concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS,
			}
		);

		const imageAnalyzerWorker = setup.deps.queue.createWorker<"analyze-image">(
			"analyze-image",
			async (job: AnalyzeImageJob) =>
				analyzeImageOrchestrator(
					{
						db: setup.deps.db,
						storage: setup.deps.storage,
						aiClient: setup.deps.aiClient,
						logger: setup.deps.logger,
					},
					job
				),
			{
				concurrency: WORKER_CONFIG.MAX_CONCURRENT_JOBS,
			}
		);

		_workers = [imageProcessorWorker, imageAnalyzerWorker];
	});

	afterEach(async () => {
		// Clean up data after each test to ensure isolation
		await setup.cleanup();
	});

	afterAll(async () => {
		await Promise.all(_workers.map((w) => w.close()));
		// await setup.close();
	});

	describe("upload", () => {
		test("should generate presigned upload URL", async () => {
			const result = await call(
				wardrobeRouter.upload,
				{
					contentType: "image/jpeg",
					fileName: "test.jpg",
				},
				{ context }
			);

			expect(result.itemId).toBeDefined();
			expect(result.uploadUrl).toContain("http");
			expect(result.status).toBe("awaiting_upload");
		});
	});

	describe("getItems", () => {
		test("should return empty list for new user", async () => {
			const result = await call(
				wardrobeRouter.getItems,
				{ limit: 10, offset: 0 },
				{ context }
			);

			expect(result.items).toBeArray();
			expect(result.pagination.total).toBe(0);
		});
	});

	describe("getTags", () => {
		test("should return tag statistics for user", async () => {
			const result = await call(wardrobeRouter.getTags, {}, { context });

			expect(result.tags).toBeArray();
			expect(result.categories).toBeArray();
			expect(result.totalTags).toBeNumber();
			expect(result.totalItems).toBeNumber();
		});
	});

	describe("integration: upload + AI processing", () => {
		test(
			"should upload and analyze clothing image",
			async () => {
				// Upload and wait for processing
				const itemId = await uploadAndProcessImage(context, TEST_IMAGES.shirt);

				// Verify item was created
				const item = await context.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, itemId),
					with: {
						analysis: true,
						categories: {
							with: { category: true },
						},
						colors: {
							with: { color: true },
						},
						tags: {
							with: {
								tag: {
									with: { type: true },
								},
							},
						},
					},
				});

				expect(item).toBeDefined();
				expect(item?.status).toBe("completed");
				expect(item?.analysis).toBeDefined();
				expect(item?.categories.length).toBeGreaterThan(0);
				expect(item?.tags.length).toBeGreaterThan(0);

				// Verify AI analysis quality
				const analysis = await context.db.query.clothingAnalysesTable.findFirst(
					{
						where: eq(clothingAnalysesTable.itemId, itemId),
					}
				);

				expect(analysis?.modelVersion).toBeDefined();
			},
			AI_PROCESSING_TIMEOUT_MS
		);

		test(
			"should process multiple images correctly",
			async () => {
				const itemIds = await Promise.all([
					uploadAndProcessImage(context, TEST_IMAGES.shirt),
					uploadAndProcessImage(context, TEST_IMAGES.pants),
				]);

				expect(itemIds).toHaveLength(2);

				// Verify all items are ready
				const items = await context.db.query.clothingItemsTable.findMany({
					where: (table, { inArray }) => inArray(table.id, itemIds),
				});

				for (const item of items) {
					expect(item.status).toBe("completed");
				}
			},
			MULTIPLE_UPLOADS_TIMEOUT_MS
		);
	});

	describe("getItem", () => {
		test(
			"should return item with analysis",
			async () => {
				// First upload an image
				const itemId = await uploadAndProcessImage(context, TEST_IMAGES.dress);

				// Then fetch it
				const result = await call(
					wardrobeRouter.getItem,
					{ itemId },
					{ context }
				);

				expect(result.id).toBe(itemId);
				expect(result.imageUrl).toBeDefined();
				expect(result.status).toBe("completed");
				expect(result.analysis).toBeDefined();
				expect(result.categories).toBeArray();
				expect(result.tags).toBeArray();
			},
			TEST_TIMEOUT_MS
		);
	});

	describe("deleteItem", () => {
		test(
			"should delete item and its analysis",
			async () => {
				// Upload an image
				const itemId = await uploadAndProcessImage(context, TEST_IMAGES.shirt);

				// Delete it
				const result = await call(
					wardrobeRouter.deleteItem,
					{ itemId },
					{ context }
				);

				expect(result.success).toBe(true);

				// Verify it's gone
				const item = await context.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, itemId),
				});

				expect(item).toBeUndefined();
			},
			TEST_TIMEOUT_MS
		);
	});
});
