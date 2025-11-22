import {
	clothingCategoryEnum,
	clothingFitEnum,
	clothingFormalityEnum,
	clothingSeasonEnum,
} from "@ai-stilist/db/schema/wardrobe";
import { z } from "zod";

// Import enums from DB schema (single source of truth)
export const ClothingCategory = z.enum(clothingCategoryEnum);
export type ClothingCategory = z.infer<typeof ClothingCategory>;

export const ClothingFormality = z.enum(clothingFormalityEnum);
export type ClothingFormality = z.infer<typeof ClothingFormality>;

export const ClothingFit = z.enum(clothingFitEnum);
export type ClothingFit = z.infer<typeof ClothingFit>;

export const ClothingSeason = z.enum(clothingSeasonEnum);
export type ClothingSeason = z.infer<typeof ClothingSeason>;

/**
 * Schema for AI-extracted clothing metadata
 * This is what the vision AI should return
 */
export const ClothingMetadataSchema = z.object({
	category: ClothingCategory,
	subcategory: z
		.string()
		.describe("Specific type like 'shirt', 'jeans', 'sneakers'"),
	colors: z
		.array(z.string().regex(/^#[0-9A-F]{6}$/i))
		.describe("Array of hex color codes"),
	primaryColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i)
		.describe("Primary hex color code"),
	patterns: z
		.array(z.string())
		.describe("Patterns like 'solid', 'striped', 'floral', 'checked'"),
	formality: ClothingFormality,
	seasons: z
		.array(ClothingSeason)
		.min(1)
		.describe("Suitable seasons for this item"),
	occasions: z
		.array(z.string())
		.describe("Occasions like 'work', 'date', 'gym', 'party'"),
	fit: ClothingFit,
	material: z
		.string()
		.nullable()
		.describe("Material like 'cotton', 'denim', 'leather'"),
	styleTags: z
		.array(z.string())
		.describe("Style tags like 'minimalist', 'streetwear', 'vintage'"),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("AI confidence score for this analysis"),
});

export type ClothingMetadata = z.infer<typeof ClothingMetadataSchema>;

/**
 * System prompt for clothing image analysis
 */
export const CLOTHING_ANALYSIS_PROMPT = `You are an expert fashion analyst. Analyze the clothing item in the image and extract detailed metadata.

Instructions:
- Be specific and accurate
- Extract ALL visible colors as hex codes
- Identify the primary/dominant color
- Detect patterns (solid, striped, floral, checked, polka-dot, etc.)
- Determine formality level based on style and context
- Suggest suitable seasons based on material and style
- List appropriate occasions for wearing this item
- Identify fit type (slim, regular, loose, oversized)
- Detect material if visible (cotton, denim, leather, silk, etc.)
- Add relevant style tags (minimalist, streetwear, vintage, preppy, bohemian, etc.)
- Provide a confidence score (0-1) for your analysis

Be thorough but concise. Focus on observable characteristics.`;
