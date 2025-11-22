import { describe, expect, test } from "bun:test";
import {
	createFailingMockAiClient,
	createMockAiClient,
} from "@ai-stilist/test-utils/ai-mock";
import { analyzeClothingImage } from "./clothing-analyzer";
import type { ClothingMetadata } from "./metadata-schemas";

describe("Clothing Analyzer", () => {
	const mockImageUrl = "http://example.com/test-image.jpg";

	const validMetadata: ClothingMetadata = {
		category: "top",
		subcategory: "t-shirt",
		colors: ["#0000FF", "#FFFFFF"],
		primaryColor: "#0000FF",
		patterns: ["solid"],
		formality: "casual",
		seasons: ["spring", "summer"],
		occasions: ["casual", "everyday"],
		fit: "regular",
		material: "cotton",
		styleTags: ["minimalist", "basic"],
		confidence: 0.95,
	};

	test("Successfully analyzes clothing image", async () => {
		const mockAiClient = createMockAiClient({
			generateObject: {
				object: validMetadata,
				usage: {
					totalTokens: 1500,
					promptTokens: 1200,
					completionTokens: 300,
				},
			},
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.metadata).toEqual(validMetadata);
		expect(result.tokensUsed).toBe(1500);
		expect(result.durationMs).toBeGreaterThan(0);
	});

	test("Returns metadata with correct structure", async () => {
		const mockAiClient = createMockAiClient({
			generateObject: {
				object: validMetadata,
			},
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		// Check all required fields exist
		expect(result.metadata.category).toBeDefined();
		expect(result.metadata.subcategory).toBeDefined();
		expect(result.metadata.colors).toBeInstanceOf(Array);
		expect(result.metadata.primaryColor).toBeDefined();
		expect(result.metadata.patterns).toBeInstanceOf(Array);
		expect(result.metadata.formality).toBeDefined();
		expect(result.metadata.seasons).toBeInstanceOf(Array);
		expect(result.metadata.occasions).toBeInstanceOf(Array);
		expect(result.metadata.fit).toBeDefined();
		expect(result.metadata.styleTags).toBeInstanceOf(Array);
		expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
		expect(result.metadata.confidence).toBeLessThanOrEqual(1);
	});

	test("Handles AI API failure", async () => {
		const mockAiClient = createFailingMockAiClient("API rate limit exceeded");

		await expect(
			analyzeClothingImage({
				imageUrl: mockImageUrl,
				aiClient: mockAiClient,
			})
		).rejects.toThrow("Failed to analyze clothing image");
	});

	test("Handles network errors", async () => {
		const mockAiClient = createFailingMockAiClient("Network timeout");

		await expect(
			analyzeClothingImage({
				imageUrl: mockImageUrl,
				aiClient: mockAiClient,
			})
		).rejects.toThrow();
	});

	test("Tracks processing duration", async () => {
		const mockAiClient = createMockAiClient({
			generateObject: {
				object: validMetadata,
			},
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.durationMs).toBeGreaterThan(0);
		expect(result.durationMs).toBeLessThan(10_000); // Should be quick for mocked call
	});

	test("Works with different clothing categories", async () => {
		const categories = [
			"top",
			"bottom",
			"shoes",
			"outerwear",
			"accessory",
		] as const;

		for (const category of categories) {
			const metadata: ClothingMetadata = {
				...validMetadata,
				category,
			};

			const mockAiClient = createMockAiClient({
				generateObject: { object: metadata },
			});

			const result = await analyzeClothingImage({
				imageUrl: mockImageUrl,
				aiClient: mockAiClient,
			});

			expect(result.metadata.category).toBe(category);
		}
	});

	test("Works with different formality levels", async () => {
		const formalityLevels = [
			"casual",
			"smart-casual",
			"business",
			"formal",
		] as const;

		for (const formality of formalityLevels) {
			const metadata: ClothingMetadata = {
				...validMetadata,
				formality,
			};

			const mockAiClient = createMockAiClient({
				generateObject: { object: metadata },
			});

			const result = await analyzeClothingImage({
				imageUrl: mockImageUrl,
				aiClient: mockAiClient,
			});

			expect(result.metadata.formality).toBe(formality);
		}
	});

	test("Handles null material", async () => {
		const metadataWithNullMaterial: ClothingMetadata = {
			...validMetadata,
			material: null,
		};

		const mockAiClient = createMockAiClient({
			generateObject: { object: metadataWithNullMaterial },
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.metadata.material).toBeNull();
	});

	test("Handles low confidence scores", async () => {
		const lowConfidenceMetadata: ClothingMetadata = {
			...validMetadata,
			confidence: 0.45,
		};

		const mockAiClient = createMockAiClient({
			generateObject: { object: lowConfidenceMetadata },
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.metadata.confidence).toBe(0.45);
	});

	test("Handles multiple colors", async () => {
		const multiColorMetadata: ClothingMetadata = {
			...validMetadata,
			colors: ["#FF0000", "#00FF00", "#0000FF", "#FFFFFF"],
			primaryColor: "#FF0000",
		};

		const mockAiClient = createMockAiClient({
			generateObject: { object: multiColorMetadata },
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.metadata.colors).toHaveLength(4);
		expect(result.metadata.primaryColor).toBe("#FF0000");
	});

	test("Handles multiple patterns", async () => {
		const multiPatternMetadata: ClothingMetadata = {
			...validMetadata,
			patterns: ["striped", "checkered", "floral"],
		};

		const mockAiClient = createMockAiClient({
			generateObject: { object: multiPatternMetadata },
		});

		const result = await analyzeClothingImage({
			imageUrl: mockImageUrl,
			aiClient: mockAiClient,
		});

		expect(result.metadata.patterns).toHaveLength(3);
		expect(result.metadata.patterns).toContain("striped");
	});
});
