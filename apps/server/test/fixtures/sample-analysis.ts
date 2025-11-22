import type { ClothingAnalysis } from "@ai-stilist/wardrobe/metadata-schemas";

/**
 * Sample AI analysis responses for testing
 * Matches the test images defined in test-images.ts
 */

export const SAMPLE_ANALYSIS = {
	tShirt: {
		category: "t-shirt",
		colors: ["navy", "#1a365d"],
		tags: [
			"casual",
			"cotton",
			"short-sleeve",
			"crew-neck",
			"summer",
			"everyday",
		],
		confidence: 0.95,
	},
	jeans: {
		category: "jeans",
		colors: ["dark-blue", "#0d1b2a"],
		tags: [
			"denim",
			"casual",
			"straight-fit",
			"everyday",
			"versatile",
			"year-round",
		],
		confidence: 0.92,
	},
	dress: {
		category: "dress",
		colors: ["black", "#000000", "white", "#ffffff"],
		tags: [
			"formal",
			"midi-length",
			"sleeveless",
			"business",
			"cocktail",
			"summer",
			"elegant",
		],
		confidence: 0.88,
	},
	sneakers: {
		category: "sneakers",
		colors: ["white", "#ffffff", "grey", "#808080"],
		tags: [
			"athletic",
			"casual",
			"low-top",
			"lace-up",
			"versatile",
			"everyday",
			"comfortable",
		],
		confidence: 0.93,
	},
	lowConfidence: {
		category: "unknown",
		colors: ["mixed"],
		tags: ["unclear", "low-quality-image"],
		confidence: 0.3,
	},
} as const;

export type SampleAnalysisKeys = keyof typeof SAMPLE_ANALYSIS;

/**
 * Create a custom analysis response for testing
 */
export function createCustomAnalysis(
	overrides: Partial<ClothingAnalysis>
): ClothingAnalysis {
	return {
		category: overrides.category ?? "unknown",
		colors: overrides.colors ?? [],
		tags: overrides.tags ?? [],
		confidence: overrides.confidence ?? 0.5,
	};
}
