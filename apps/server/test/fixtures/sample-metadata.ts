import type { ClothingMetadata } from "@ai-stilist/wardrobe/metadata-schemas";

/**
 * Sample clothing metadata for testing
 * These represent typical AI-extracted metadata from clothing images
 */
export const SAMPLE_METADATA: Record<
	string,
	Omit<ClothingMetadata, "confidence">
> = {
	blueShirt: {
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
	},

	blackJeans: {
		category: "bottom",
		subcategory: "jeans",
		colors: ["#000000"],
		primaryColor: "#000000",
		patterns: ["solid"],
		formality: "casual",
		seasons: ["fall", "winter", "spring"],
		occasions: ["casual", "work"],
		fit: "slim",
		material: "denim",
		styleTags: ["classic", "versatile"],
	},

	whiteSneakers: {
		category: "shoes",
		subcategory: "sneakers",
		colors: ["#FFFFFF"],
		primaryColor: "#FFFFFF",
		patterns: ["solid"],
		formality: "casual",
		seasons: ["spring", "summer", "fall"],
		occasions: ["casual", "everyday", "gym"],
		fit: "regular",
		material: null,
		styleTags: ["athletic", "minimalist"],
	},

	navyBlazer: {
		category: "outerwear",
		subcategory: "blazer",
		colors: ["#000080"],
		primaryColor: "#000080",
		patterns: ["solid"],
		formality: "business",
		seasons: ["fall", "winter", "spring"],
		occasions: ["work", "formal", "business"],
		fit: "regular",
		material: "wool",
		styleTags: ["professional", "classic"],
	},

	stripedShirt: {
		category: "top",
		subcategory: "button-up shirt",
		colors: ["#FFFFFF", "#000080"],
		primaryColor: "#FFFFFF",
		patterns: ["striped"],
		formality: "smart-casual",
		seasons: ["spring", "summer", "fall"],
		occasions: ["work", "casual", "date"],
		fit: "slim",
		material: "cotton",
		styleTags: ["preppy", "classic"],
	},

	leatherJacket: {
		category: "outerwear",
		subcategory: "jacket",
		colors: ["#000000"],
		primaryColor: "#000000",
		patterns: ["solid"],
		formality: "casual",
		seasons: ["fall", "winter"],
		occasions: ["casual", "date", "party"],
		fit: "regular",
		material: "leather",
		styleTags: ["edgy", "classic"],
	},
};

/**
 * Helper to get sample metadata with specified confidence
 */
export function withConfidence(
	metadata: Omit<ClothingMetadata, "confidence">,
	confidence = 0.95
): ClothingMetadata {
	return {
		...metadata,
		confidence,
	};
}
