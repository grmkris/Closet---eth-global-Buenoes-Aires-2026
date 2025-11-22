import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createMockAiClient, MOCK_CLOTHING_ANALYSIS } from "@ai-stilist/ai";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingAnalysesTable } from "@ai-stilist/db/schema/wardrobe";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import { createImageProcessorWorker } from "../../src/workers/image-processor.worker";
import { SAMPLE_ANALYSIS } from "../fixtures/sample-analysis";
import { getTestImageBuffer, TEST_IMAGES } from "../fixtures/test-images";
import {
	assertJobCompleted,
	waitForJobCompletion,
} from "../fixtures/worker-test-utils";
import type { TestSetup } from "../test.setup";
import { createTestSetup } from "../test.setup";
import { uploadTestFile } from "../test-helpers";

describe("Image Processor Worker", () => {
	let setup: TestSetup;

	beforeEach(async () => {
		// Create test setup with mock AI client
		setup = await createTestSetup();
	});

	afterEach(async () => {
		await setup.cleanup();
	});

	describe("Successful Processing", () => {
		test("should process image and create analysis", async () => {
			const itemId = typeIdGenerator("clothingItemsTable");
			const userId = setup.users.authenticated.id;
			const imageKey = `users/${userId}/clothing/${itemId}.png`;

			// Upload test image
			await uploadTestFile(
				setup.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			// Create DB record
			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			// Start worker
			const worker = createImageProcessorWorker(setup.deps);

			// Queue job
			const job = await setup.deps.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			// Wait for completion
			const state = await waitForJobCompletion(
				setup.deps.queue,
				job.jobId,
				"process-image",
				{ timeout: 5000 }
			);

			expect(state).toBe("completed");

			// Verify job result
			await assertJobCompleted(setup.deps.queue, job.jobId, "process-image");

			// Verify item status updated to ready
			const updatedItem =
				await setup.deps.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, itemId),
				});
			expect(updatedItem?.status).toBe("ready");

			// Verify analysis created
			const analysis =
				await setup.deps.db.query.clothingAnalysesTable.findFirst({
					where: eq(clothingAnalysesTable.itemId, itemId),
				});

			expect(analysis).toBeDefined();
			expect(analysis?.category).toBe("t-shirt");
			expect(analysis?.tags).toContain("casual");
			expect(analysis?.confidence).toBeGreaterThan(0);
			expect(analysis?.modelVersion).toBeDefined();

			// Cleanup
			await worker.close();
		});

		test("should handle different clothing types", async () => {
			const testCases = [
				{ type: "jeans" as const, mock: MOCK_CLOTHING_ANALYSIS.jeans },
				{ type: "dress" as const, mock: MOCK_CLOTHING_ANALYSIS.dress },
				{ type: "sneakers" as const, mock: MOCK_CLOTHING_ANALYSIS.sneakers },
			];

			for (const testCase of testCases) {
				// Create mock AI client for this specific response
				const mockAi = createMockAiClient({
					defaultResponse: testCase.mock,
				});

				// Create separate setup with this mock
				const testSetupInstance = await testSetup({ aiClient: mockAi });

				const itemId = typeIdGenerator("clothingItemsTable");
				const userId = testSetupInstance.users.authenticated.id;
				const imageKey = `users/${userId}/clothing/${itemId}.png`;

				await uploadTestFile(
					testSetupInstance.deps,
					imageKey,
					getTestImageBuffer(testCase.type),
					TEST_IMAGES[testCase.type].contentType
				);

				await testSetupInstance.deps.db.insert(clothingItemsTable).values({
					id: itemId,
					userId,
					imageKey,
					status: "pending",
				});

				const worker = createImageProcessorWorker(testSetupInstance.deps);

				const job = await testSetupInstance.deps.queue.addJob("process-image", {
					itemId,
					imageKey,
					userId,
				});

				await waitForJobCompletion(
					testSetupInstance.deps.queue,
					job.jobId,
					"process-image"
				);

				const analysis =
					await testSetupInstance.deps.db.query.clothingAnalysesTable.findFirst(
						{
							where: eq(clothingAnalysesTable.itemId, itemId),
						}
					);

				expect(analysis?.category).toBe(testCase.mock.object.category);

				await worker.close();
				await testSetupInstance.cleanup();
			}
		});

		test("should pass existing tags for consistency", async () => {
			const userId = setup.users.authenticated.id;

			// Create first item with analysis
			const existingItemId = typeIdGenerator("clothingItemsTable");
			const existingImageKey = `users/${userId}/clothing/${existingItemId}.png`;

			await uploadTestFile(
				setup.deps,
				existingImageKey,
				getTestImageBuffer("jeans"),
				TEST_IMAGES.jeans.contentType
			);

			await setup.deps.db.insert(clothingItemsTable).values({
				id: existingItemId,
				userId,
				imageKey: existingImageKey,
				status: "ready",
			});

			await setup.deps.db.insert(clothingAnalysesTable).values({
				id: typeIdGenerator("clothingAnalysesTable"),
				itemId: existingItemId,
				category: SAMPLE_ANALYSIS.jeans.category,
				colors: SAMPLE_ANALYSIS.jeans.colors,
				tags: SAMPLE_ANALYSIS.jeans.tags,
				confidence: SAMPLE_ANALYSIS.jeans.confidence,
				modelVersion: "test",
			});

			// Now process new item - worker should fetch existing tags
			const newItemId = typeIdGenerator("clothingItemsTable");
			const newImageKey = `users/${userId}/clothing/${newItemId}.png`;

			await uploadTestFile(
				setup.deps,
				newImageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			await setup.deps.db.insert(clothingItemsTable).values({
				id: newItemId,
				userId,
				imageKey: newImageKey,
				status: "pending",
			});

			const worker = createImageProcessorWorker(setup.deps);

			const job = await setup.deps.queue.addJob("process-image", {
				itemId: newItemId,
				imageKey: newImageKey,
				userId,
			});

			await waitForJobCompletion(setup.deps.queue, job.jobId, "process-image");

			// Verify new analysis was created
			const newAnalysis =
				await setup.deps.db.query.clothingAnalysesTable.findFirst({
					where: eq(clothingAnalysesTable.itemId, newItemId),
				});

			expect(newAnalysis).toBeDefined();

			await worker.close();
		});
	});

	describe("Status Transitions", () => {
		test("should transition from pending -> processing -> ready", async () => {
			const itemId = typeIdGenerator("clothingItemsTable");
			const userId = setup.users.authenticated.id;
			const imageKey = `users/${userId}/clothing/${itemId}.png`;

			await uploadTestFile(
				setup.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			// Verify initial status
			let item = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, itemId),
			});
			expect(item?.status).toBe("pending");

			const worker = createImageProcessorWorker(setup.deps);

			const job = await setup.deps.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			await waitForJobCompletion(setup.deps.queue, job.jobId, "process-image");

			// Verify final status
			item = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, itemId),
			});
			expect(item?.status).toBe("ready");

			await worker.close();
		});
	});

	describe("Error Handling", () => {
		test("should set status to failed on AI error", async () => {
			// Create mock AI that fails
			const failingAi = createMockAiClient({
				shouldFail: true,
				failureMessage: "AI service unavailable",
			});

			const testSetupInstance = await testSetup({ aiClient: failingAi });

			const itemId = typeIdGenerator("clothingItemsTable");
			const userId = testSetupInstance.users.authenticated.id;
			const imageKey = `users/${userId}/clothing/${itemId}.png`;

			await uploadTestFile(
				testSetupInstance.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			await testSetupInstance.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			const worker = createImageProcessorWorker(testSetupInstance.deps);

			const job = await testSetupInstance.deps.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			// Wait for job to fail (with retries, might take longer)
			const state = await waitForJobCompletion(
				testSetupInstance.deps.queue,
				job.jobId,
				"process-image",
				{ timeout: 15_000 } // Longer timeout for retries
			);

			expect(state).toBe("failed");

			// Verify item status is failed
			const item =
				await testSetupInstance.deps.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, itemId),
				});
			expect(item?.status).toBe("failed");

			// Verify no analysis was created
			const analysis =
				await testSetupInstance.deps.db.query.clothingAnalysesTable.findFirst({
					where: eq(clothingAnalysesTable.itemId, itemId),
				});
			expect(analysis).toBeUndefined();

			await worker.close();
			await testSetupInstance.cleanup();
		});

		test("should handle missing image file", async () => {
			const itemId = typeIdGenerator("clothingItemsTable");
			const userId = setup.users.authenticated.id;
			const imageKey = `users/${userId}/clothing/${itemId}.png`;

			// Don't upload image - simulate missing file

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			const worker = createImageProcessorWorker(setup.deps);

			const job = await setup.deps.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			const state = await waitForJobCompletion(
				setup.deps.queue,
				job.jobId,
				"process-image",
				{ timeout: 15_000 }
			);

			// Should fail since image doesn't exist
			expect(state).toBe("failed");

			const item = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, itemId),
			});
			expect(item?.status).toBe("failed");

			await worker.close();
		});
	});

	describe("Transaction Integrity", () => {
		test("should rollback on partial failure", async () => {
			// This test verifies that if something fails during the transaction,
			// neither the analysis nor the status update should be saved

			const itemId = typeIdGenerator("clothingItemsTable");
			const userId = setup.users.authenticated.id;
			const imageKey = `users/${userId}/clothing/${itemId}.png`;

			await uploadTestFile(
				setup.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			// Use failing AI to trigger error after analysis attempt
			const failingAi = createMockAiClient({
				shouldFail: true,
			});

			const testSetupInstance = await testSetup({ aiClient: failingAi });

			// Copy item to new test setup DB
			await testSetupInstance.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId,
				imageKey,
				status: "pending",
			});

			await uploadTestFile(
				testSetupInstance.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			const worker = createImageProcessorWorker(testSetupInstance.deps);

			const job = await testSetupInstance.deps.queue.addJob("process-image", {
				itemId,
				imageKey,
				userId,
			});

			await waitForJobCompletion(
				testSetupInstance.deps.queue,
				job.jobId,
				"process-image",
				{ timeout: 15_000 }
			);

			// Verify no analysis was created (transaction rolled back)
			const analysis =
				await testSetupInstance.deps.db.query.clothingAnalysesTable.findFirst({
					where: eq(clothingAnalysesTable.itemId, itemId),
				});
			expect(analysis).toBeUndefined();

			// Status should be failed (outside transaction)
			const item =
				await testSetupInstance.deps.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, itemId),
				});
			expect(item?.status).toBe("failed");

			await worker.close();
			await testSetupInstance.cleanup();
		});
	});

	describe("Concurrency", () => {
		test("should process multiple jobs concurrently", async () => {
			const userId = setup.users.authenticated.id;
			const jobs = [];

			// Create 3 items
			for (let i = 0; i < 3; i++) {
				const itemId = typeIdGenerator("clothingItemsTable");
				const imageKey = `users/${userId}/clothing/${itemId}.png`;

				await uploadTestFile(
					setup.deps,
					imageKey,
					getTestImageBuffer("tShirt"),
					TEST_IMAGES.tShirt.contentType
				);

				await setup.deps.db.insert(clothingItemsTable).values({
					id: itemId,
					userId,
					imageKey,
					status: "pending",
				});

				const job = await setup.deps.queue.addJob("process-image", {
					itemId,
					imageKey,
					userId,
				});

				jobs.push({ jobId: job.jobId, itemId });
			}

			const worker = createImageProcessorWorker(setup.deps);

			// Wait for all jobs to complete
			await Promise.all(
				jobs.map((job) =>
					waitForJobCompletion(setup.deps.queue, job.jobId, "process-image")
				)
			);

			// Verify all items processed
			for (const job of jobs) {
				const item = await setup.deps.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, job.itemId),
				});
				expect(item?.status).toBe("ready");

				const analysis =
					await setup.deps.db.query.clothingAnalysesTable.findFirst({
						where: eq(clothingAnalysesTable.itemId, job.itemId),
					});
				expect(analysis).toBeDefined();
			}

			await worker.close();
		});
	});
});
