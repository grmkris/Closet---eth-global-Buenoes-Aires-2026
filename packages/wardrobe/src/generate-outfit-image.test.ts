import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { uploadTestFile } from "@ai-stilist/test-utils/test-helpers";
import {
	createTestSetup,
	type TestSetup,
} from "@ai-stilist/test-utils/test-setup";
import type { ClothingItemWithMetadata } from "./generate-outfit-image";
import {
	buildOutfitPrompt,
	generateOutfitImage,
} from "./generate-outfit-image";

// Test timeout for AI image generation (60 seconds)
const AI_GENERATION_TIMEOUT_MS = 60_000;

/**
 * Integration tests for outfit image generation using real AI, storage, and logger.
 * Requires GOOGLE_GEMINI_API_KEY environment variable to run full integration tests.
 */
describe("generateOutfitImage", () => {
	let testEnv: TestSetup;

	beforeEach(async () => {
		testEnv = await createTestSetup();
	});

	afterEach(async () => {
		await testEnv.cleanup();
	});

	afterAll(async () => {
		await testEnv.close();
	});

	it("should validate input requirements", async () => {
		await expect(
			generateOutfitImage({
				items: [],
				aiClient: testEnv.deps.aiClient,
				storageClient: testEnv.deps.storage,
				logger: testEnv.deps.logger,
				userId: testEnv.users.authenticated.id,
			})
		).rejects.toThrow("At least one clothing item is required");
	});

	it.skip(
		"should generate outfit image with reference images",
		async () => {
			// Skip: Requires GOOGLE_GEMINI_API_KEY and real AI generation
			// To enable: Set GOOGLE_GEMINI_API_KEY env var and remove .skip

			// 1. Create test image (1x1 red pixel PNG)
			const testImageBuffer = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
				"base64"
			);

			// 2. Upload test image to storage
			const imageKey = `users/${testEnv.users.authenticated.id}/clothing/test_item_001.webp`;
			await uploadTestFile(
				testEnv.deps,
				imageKey,
				testImageBuffer,
				"image/webp"
			);

			// 3. Create clothing item metadata
			const items: ClothingItemWithMetadata[] = [
				{
					id: "itm_test123" as ClothingItemId,
					processedImageKey: imageKey,
					categories: [{ category: { name: "top", displayName: "Top" } }],
					colors: [{ color: { name: "navy", hexCode: "#000080" } }],
					tags: [
						{
							tag: {
								name: "t-shirt",
								type: { name: "item", displayName: "Item" },
							},
						},
						{
							tag: {
								name: "casual",
								type: { name: "style", displayName: "Style" },
							},
						},
					],
				},
			];

			// 4. Generate outfit image
			const result = await generateOutfitImage({
				items,
				occasion: "casual",
				style: "minimalist",
				aiClient: testEnv.deps.aiClient,
				storageClient: testEnv.deps.storage,
				logger: testEnv.deps.logger,
				userId: testEnv.users.authenticated.id,
			});

			// 5. Verify result
			expect(result.imageUrl).toBeDefined();
			expect(result.imageUrl).toContain("users/");
			expect(result.storageKey).toContain("users/");
			expect(result.storageKey).toContain("/generated/outfit-");
			expect(result.prompt).toContain("t-shirt");
			expect(result.prompt).toContain("casual");
			expect(result.prompt).toContain("minimalist");
		},
		AI_GENERATION_TIMEOUT_MS
	);
});

describe("buildOutfitPrompt", () => {
	it("should build prompt with single item metadata", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "navy", hexCode: "#000080" } }],
				tags: [
					{
						tag: {
							name: "t-shirt",
							type: { name: "item", displayName: "Item" },
						},
					},
				],
			},
		];

		const prompt = buildOutfitPrompt({ items });

		expect(prompt).toContain("Item 1:");
		expect(prompt).toContain("Top");
		expect(prompt).toContain("navy");
		expect(prompt).toContain("t-shirt");
		expect(prompt).toContain("item: t-shirt");
	});

	it("should build prompt with multiple items", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test1.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "white", hexCode: "#FFFFFF" } }],
				tags: [
					{
						tag: {
							name: "t-shirt",
							type: { name: "item", displayName: "Item" },
						},
					},
				],
			},
			{
				id: "itm_002" as ClothingItemId,
				processedImageKey: "test2.webp",
				categories: [{ category: { name: "bottom", displayName: "Bottom" } }],
				colors: [{ color: { name: "blue", hexCode: "#0000FF" } }],
				tags: [
					{
						tag: {
							name: "jeans",
							type: { name: "item", displayName: "Item" },
						},
					},
				],
			},
		];

		const prompt = buildOutfitPrompt({ items });

		expect(prompt).toContain("Item 1:");
		expect(prompt).toContain("Item 2:");
		expect(prompt).toContain("Top");
		expect(prompt).toContain("Bottom");
		expect(prompt).toContain("white");
		expect(prompt).toContain("blue");
		expect(prompt).toContain("t-shirt");
		expect(prompt).toContain("jeans");
	});

	it("should include occasion in prompt", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "black", hexCode: "#000000" } }],
				tags: [],
			},
		];

		const prompt = buildOutfitPrompt({ items, occasion: "business meeting" });

		expect(prompt).toContain("Occasion: business meeting");
	});

	it("should include style in prompt", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "black", hexCode: "#000000" } }],
				tags: [],
			},
		];

		const prompt = buildOutfitPrompt({ items, style: "streetwear" });

		expect(prompt).toContain("Style aesthetic: streetwear");
	});

	it("should handle multiple colors", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [
					{ color: { name: "navy", hexCode: "#000080" } },
					{ color: { name: "white", hexCode: "#FFFFFF" } },
				],
				tags: [],
			},
		];

		const prompt = buildOutfitPrompt({ items });

		expect(prompt).toContain("navy, white");
	});

	it("should group tags by type", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "black", hexCode: "#000000" } }],
				tags: [
					{
						tag: {
							name: "t-shirt",
							type: { name: "item", displayName: "Item" },
						},
					},
					{
						tag: {
							name: "casual",
							type: { name: "style", displayName: "Style" },
						},
					},
					{
						tag: {
							name: "cotton",
							type: { name: "material", displayName: "Material" },
						},
					},
				],
			},
		];

		const prompt = buildOutfitPrompt({ items });

		expect(prompt).toContain("item: t-shirt");
		expect(prompt).toContain("style: casual");
		expect(prompt).toContain("material: cotton");
	});

	it("should include all required prompt sections", () => {
		const items: ClothingItemWithMetadata[] = [
			{
				id: "itm_001" as ClothingItemId,
				processedImageKey: "test.webp",
				categories: [{ category: { name: "top", displayName: "Top" } }],
				colors: [{ color: { name: "black", hexCode: "#000000" } }],
				tags: [],
			},
		];

		const prompt = buildOutfitPrompt({
			items,
			occasion: "work",
			style: "professional",
		});

		expect(prompt).toContain("Create a photorealistic outfit visualization");
		expect(prompt).toContain("Occasion: work");
		expect(prompt).toContain("Style aesthetic: professional");
		expect(prompt).toContain("Requirements:");
		expect(prompt).toContain("Show all items clearly and proportionally");
		expect(prompt).toContain("Professional fashion photography style");
		expect(prompt).toContain("Clean white or neutral background");
	});
});
