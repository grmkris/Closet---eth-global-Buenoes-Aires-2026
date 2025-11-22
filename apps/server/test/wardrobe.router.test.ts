import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { wardrobeRouter } from "@ai-stilist/api/routers/wardrobe.router";
import { eq } from "@ai-stilist/db/drizzle";
import { clothingAnalysesTable } from "@ai-stilist/db/schema/wardrobe";
import { typeIdGenerator, UserId } from "@ai-stilist/shared/typeid";
import { call } from "@orpc/server";
import { SAMPLE_ANALYSIS } from "./fixtures/sample-analysis";
import { getTestImageBuffer, TEST_IMAGES } from "./fixtures/test-images";
import { getJobCount } from "./fixtures/worker-test-utils";
import type { TestSetup } from "./test.setup";
import { createTestSetup } from "./test.setup";
import {
	createAuthenticatedContext,
	createUnauthenticatedContext,
	uploadTestFile,
} from "./test-helpers";

describe("Wardrobe Router", () => {
	let setup: TestSetup;

	beforeEach(async () => {
		setup = await createTestSetup();
	});

	afterEach(async () => {
		await setup.cleanup();
	});

	describe("upload", () => {
		test("should create upload URL and queue processing job", async () => {
			const context = createAuthenticatedContext(setup);

			const result = await call(
				wardrobeRouter.upload,
				{
					contentType: TEST_IMAGES.tShirt.contentType,
					fileName: TEST_IMAGES.tShirt.filename,
				},
				{ context }
			);

			// Verify response structure
			expect(result.uploadUrl).toBeDefined();
			expect(result.itemId).toBeDefined();
			expect(result.status).toBe("pending");

			// Verify DB record created
			const dbItem = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, result.itemId),
			});

			expect(dbItem).toBeDefined();
			expect(dbItem?.userId).toBe(UserId.parse(setup.users.authenticated.id));
			expect(dbItem?.status).toBe("pending");
			expect(dbItem?.imageKey).toContain(result.itemId);

			// Verify job was queued
			const waitingCount = await getJobCount(
				setup.deps.queue,
				"process-image",
				"waiting"
			);
			expect(waitingCount).toBeGreaterThan(0);
		});

		test("should reject unauthenticated requests", async () => {
			const context = createUnauthenticatedContext(setup);

			await expect(
				call(
					wardrobeRouter.upload,
					{
						contentType: "image/png",
						fileName: "test.png",
					},
					{ context }
				)
			).rejects.toThrow();
		});

		test("should handle different file extensions", async () => {
			const context = createAuthenticatedContext(setup);

			const result = await call(
				wardrobeRouter.upload,
				{
					contentType: "image/jpeg",
					fileName: "photo.jpeg",
				},
				{ context }
			);

			expect(result.itemId).toBeDefined();
			expect(result.uploadUrl).toBeDefined();
			expect(result.status).toBe("pending");

			const dbItem = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, result.itemId),
			});

			expect(dbItem?.imageKey).toContain(".jpeg");
		});
	});

	describe("batchUpload", () => {
		test("should create multiple upload URLs and jobs", async () => {
			const context = createAuthenticatedContext(setup);

			const files = [
				{
					contentType: TEST_IMAGES.tShirt.contentType,
					fileName: TEST_IMAGES.tShirt.filename,
				},
				{
					contentType: TEST_IMAGES.jeans.contentType,
					fileName: TEST_IMAGES.jeans.filename,
				},
				{
					contentType: TEST_IMAGES.dress.contentType,
					fileName: TEST_IMAGES.dress.filename,
				},
			];

			const result = await call(
				wardrobeRouter.batchUpload,
				{ files },
				{ context }
			);

			expect(result.items).toHaveLength(3);

			// Verify each item
			for (const item of result.items) {
				expect(item.itemId).toBeDefined();
				expect(item.uploadUrl).toBeDefined();
				expect(item.jobId).toBeDefined();
				expect(item.status).toBe("pending");

				// Check DB
				const dbItem = await setup.deps.db.query.clothingItemsTable.findFirst({
					where: eq(clothingItemsTable.id, item.itemId),
				});
				expect(dbItem).toBeDefined();
			}

			// Verify jobs queued
			const waitingCount = await getJobCount(
				setup.deps.queue,
				"process-image",
				"waiting"
			);
			expect(waitingCount).toBe(3);
		});

		test("should reject empty batch", async () => {
			const context = createAuthenticatedContext(setup);

			await expect(
				call(wardrobeRouter.batchUpload, { files: [] }, { context })
			).rejects.toThrow();
		});

		test("should reject batch exceeding limit", async () => {
			const context = createAuthenticatedContext(setup);

			// Create 51 files (limit is 50)
			const files = Array.from({ length: 51 }, () => ({
				contentType: "image/png",
				fileName: "test.png",
			}));

			await expect(
				call(wardrobeRouter.batchUpload, { files }, { context })
			).rejects.toThrow();
		});
	});

	describe("getItems", () => {
		test("should return user's items with signed URLs", async () => {
			const context = createAuthenticatedContext(setup);

			// Create test items
			const itemId1 = typeIdGenerator("clothingItemsTable");
			const itemId2 = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values([
				{
					id: itemId1,
					userId: setup.users.authenticated.id,
					imageKey: `users/${setup.users.authenticated.id}/clothing/${itemId1}.png`,
					status: "ready",
				},
				{
					id: itemId2,
					userId: setup.users.authenticated.id,
					imageKey: `users/${setup.users.authenticated.id}/clothing/${itemId2}.png`,
					status: "pending",
				},
			]);

			// Add analysis for first item
			await setup.deps.db.insert(clothingAnalysesTable).values({
				category: SAMPLE_ANALYSIS.tShirt.category,
				colors: SAMPLE_ANALYSIS.tShirt.colors,
				tags: SAMPLE_ANALYSIS.tShirt.tags,
				confidence: SAMPLE_ANALYSIS.tShirt.confidence,
				modelVersion: "gemini-2.0-flash-exp",
			});

			const result = await call(wardrobeRouter.getItems, undefined, {
				context,
			});

			expect(result.items).toHaveLength(2);

			// Check first item has analysis
			const itemWithAnalysis = result.items.find((i) => i.id === itemId1);
			expect(itemWithAnalysis).toBeDefined();
			expect(itemWithAnalysis?.analysis).toBeDefined();
			expect(itemWithAnalysis?.analysis?.category).toBe("t-shirt");
			expect(itemWithAnalysis?.imageUrl).toContain(itemId1);

			// Check second item has no analysis
			const itemPending = result.items.find((i) => i.id === itemId2);
			expect(itemPending?.analysis).toBeNull();
		});

		test("should return empty array for new user", async () => {
			const context = createAuthenticatedContext(setup);

			const result = await call(wardrobeRouter.getItems, undefined, {
				context,
			});

			expect(result.items).toEqual([]);
		});

		test("should not return other users' items", async () => {
			const context = createAuthenticatedContext(setup);

			// Create item for different user
			const otherUserId = typeIdGenerator("user");
			const itemId = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: otherUserId,
				imageKey: `users/${otherUserId}/clothing/${itemId}.png`,
				status: "ready",
			});

			const result = await call(wardrobeRouter.getItems, undefined, {
				context,
			});

			expect(result.items).toEqual([]);
		});
	});

	describe("getItem", () => {
		test("should return single item with analysis", async () => {
			const context = createAuthenticatedContext(setup);

			// Create test item
			const itemId = typeIdGenerator("clothingItemsTable");
			const analysisId = typeIdGenerator("clothingAnalysesTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: setup.users.authenticated.id,
				imageKey: `users/${setup.users.authenticated.id}/clothing/${itemId}.png`,
				status: "ready",
			});

			await setup.deps.db.insert(clothingAnalysesTable).values({
				id: analysisId,
				itemId,
				category: SAMPLE_ANALYSIS.dress.category,
				colors: SAMPLE_ANALYSIS.dress.colors,
				tags: SAMPLE_ANALYSIS.dress.tags,
				confidence: SAMPLE_ANALYSIS.dress.confidence,
				modelVersion: "gemini-2.0-flash-exp",
			});

			const result = await call(
				wardrobeRouter.getItem,
				{ itemId },
				{ context }
			);

			expect(result.id).toBe(itemId);
			expect(result.analysis).toBeDefined();
			expect(result.analysis?.category).toBe("dress");
			expect(result.imageUrl).toBeDefined();
		});

		test("should throw if item not found", async () => {
			const context = createAuthenticatedContext(setup);

			const nonExistentId = typeIdGenerator("clothingItemsTable");

			await expect(
				call(wardrobeRouter.getItem, { itemId: nonExistentId }, { context })
			).rejects.toThrow("Item not found");
		});

		test("should throw if accessing another user's item", async () => {
			const context = createAuthenticatedContext(setup);

			const otherUserId = typeIdGenerator("user");
			const itemId = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: otherUserId,
				imageKey: `users/${otherUserId}/clothing/${itemId}.png`,
				status: "ready",
			});

			await expect(
				call(wardrobeRouter.getItem, { itemId }, { context })
			).rejects.toThrow("Item not found");
		});
	});

	describe("getTags", () => {
		test("should return all unique tags with counts", async () => {
			const context = createAuthenticatedContext(setup);

			// Create items with analyses
			const itemId1 = typeIdGenerator("clothingItemsTable");
			const itemId2 = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values([
				{
					id: itemId1,
					userId: setup.users.authenticated.id,
					imageKey: "test1.png",
					status: "ready",
				},
				{
					id: itemId2,
					userId: setup.users.authenticated.id,
					imageKey: "test2.png",
					status: "ready",
				},
			]);

			await setup.deps.db.insert(clothingAnalysesTable).values([
				{
					id: typeIdGenerator("clothingAnalysesTable"),
					itemId: itemId1,
					category: "t-shirt",
					colors: ["blue"],
					tags: ["casual", "cotton", "summer"],
					confidence: 0.9,
					modelVersion: "test",
				},
				{
					id: typeIdGenerator("clothingAnalysesTable"),
					itemId: itemId2,
					category: "jeans",
					colors: ["blue"],
					tags: ["casual", "denim", "everyday"],
					confidence: 0.9,
					modelVersion: "test",
				},
			]);

			const result = await call(wardrobeRouter.getTags, undefined, { context });

			// "casual" appears twice, others once
			expect(result.totalTags).toBe(5); // casual, cotton, summer, denim, everyday
			expect(result.totalItems).toBe(2);
			expect(result.categories).toContain("t-shirt");
			expect(result.categories).toContain("jeans");

			// Check most frequent tag is first
			expect(result.tags[0].tag).toBe("casual");
			expect(result.tags[0].count).toBe(2);
		});

		test("should return empty for new user", async () => {
			const context = createAuthenticatedContext(setup);

			const result = await call(wardrobeRouter.getTags, undefined, { context });

			expect(result.tags).toEqual([]);
			expect(result.categories).toEqual([]);
			expect(result.totalTags).toBe(0);
			expect(result.totalItems).toBe(0);
		});
	});

	describe("updateTags", () => {
		test("should replace tags when append is false", async () => {
			const context = createAuthenticatedContext(setup);

			const itemId = typeIdGenerator("clothingItemsTable");
			const analysisId = typeIdGenerator("clothingAnalysesTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: setup.users.authenticated.id,
				imageKey: "test.png",
				status: "ready",
			});

			await setup.deps.db.insert(clothingAnalysesTable).values({
				id: analysisId,
				itemId,
				category: "t-shirt",
				colors: ["blue"],
				tags: ["casual", "cotton"],
				confidence: 0.9,
				modelVersion: "test",
			});

			const result = await call(
				wardrobeRouter.updateTags,
				{
					itemId,
					tags: ["formal", "business"],
					append: false,
				},
				{ context }
			);

			expect(result.success).toBe(true);
			expect(result.tags).toEqual(["formal", "business"]);

			// Verify in DB
			const updated = await setup.deps.db.query.clothingAnalysesTable.findFirst(
				{
					where: eq(clothingAnalysesTable.itemId, itemId),
				}
			);

			expect(updated?.tags).toEqual(["formal", "business"]);
		});

		test("should append tags when append is true", async () => {
			const context = createAuthenticatedContext(setup);

			const itemId = typeIdGenerator("clothingItemsTable");
			const analysisId = typeIdGenerator("clothingAnalysesTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: setup.users.authenticated.id,
				imageKey: "test.png",
				status: "ready",
			});

			await setup.deps.db.insert(clothingAnalysesTable).values({
				id: analysisId,
				itemId,
				category: "t-shirt",
				colors: ["blue"],
				tags: ["casual", "cotton"],
				confidence: 0.9,
				modelVersion: "test",
			});

			const result = await call(
				wardrobeRouter.updateTags,
				{
					itemId,
					tags: ["summer", "casual"], // casual is duplicate
					append: true,
				},
				{ context }
			);

			expect(result.success).toBe(true);
			expect(result.tags).toHaveLength(3); // casual, cotton, summer (deduplicated)
			expect(result.tags).toContain("casual");
			expect(result.tags).toContain("cotton");
			expect(result.tags).toContain("summer");
		});

		test("should throw if item not analyzed yet", async () => {
			const context = createAuthenticatedContext(setup);

			const itemId = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: setup.users.authenticated.id,
				imageKey: "test.png",
				status: "pending",
			});

			await expect(
				call(
					wardrobeRouter.updateTags,
					{
						itemId,
						tags: ["test"],
						append: false,
					},
					{ context }
				)
			).rejects.toThrow("Item has not been analyzed yet");
		});
	});

	describe("deleteItem", () => {
		test("should delete item and cascade to analysis", async () => {
			const context = createAuthenticatedContext(setup);

			const itemId = typeIdGenerator("clothingItemsTable");
			const analysisId = typeIdGenerator("clothingAnalysesTable");
			const imageKey = `users/${setup.users.authenticated.id}/clothing/${itemId}.png`;

			// Upload test image to storage
			await uploadTestFile(
				setup.deps,
				imageKey,
				getTestImageBuffer("tShirt"),
				TEST_IMAGES.tShirt.contentType
			);

			// Create DB records
			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: setup.users.authenticated.id,
				imageKey,
				status: "ready",
			});

			await setup.deps.db.insert(clothingAnalysesTable).values({
				id: analysisId,
				itemId,
				category: "t-shirt",
				colors: ["blue"],
				tags: ["casual"],
				confidence: 0.9,
				modelVersion: "test",
			});

			// Verify item exists in storage
			const existsBefore = await setup.deps.storage.exists({ key: imageKey });
			expect(existsBefore).toBe(true);

			// Delete
			const result = await call(
				wardrobeRouter.deleteItem,
				{ itemId },
				{ context }
			);

			expect(result.success).toBe(true);

			// Verify item deleted from DB
			const dbItem = await setup.deps.db.query.clothingItemsTable.findFirst({
				where: eq(clothingItemsTable.id, itemId),
			});
			expect(dbItem).toBeUndefined();

			// Verify analysis deleted (cascade)
			const dbAnalysis =
				await setup.deps.db.query.clothingAnalysesTable.findFirst({
					where: eq(clothingAnalysesTable.itemId, itemId),
				});
			expect(dbAnalysis).toBeUndefined();

			// Verify deleted from storage
			const existsAfter = await setup.deps.storage.exists({ key: imageKey });
			expect(existsAfter).toBe(false);
		});

		test("should throw if item not found", async () => {
			const context = createAuthenticatedContext(setup);

			const nonExistentId = typeIdGenerator("clothingItemsTable");

			await expect(
				call(wardrobeRouter.deleteItem, { itemId: nonExistentId }, { context })
			).rejects.toThrow("Item not found");
		});

		test("should prevent deleting another user's item", async () => {
			const context = createAuthenticatedContext(setup);

			const otherUserId = typeIdGenerator("user");
			const itemId = typeIdGenerator("clothingItemsTable");

			await setup.deps.db.insert(clothingItemsTable).values({
				id: itemId,
				userId: otherUserId,
				imageKey: "test.png",
				status: "ready",
			});

			await expect(
				call(wardrobeRouter.deleteItem, { itemId }, { context })
			).rejects.toThrow("Item not found");
		});
	});
});
