import { z } from "zod";

/**
 * Schema for AI-extracted clothing analysis
 * Flexible schema that allows AI to dynamically categorize and tag items
 */
export const ClothingAnalysisSchema = z.object({
	category: z
		.string()
		.describe(
			"Main category like 'top', 'bottom', 'dress', 'shoes', 'accessory' - AI decides"
		),

	colors: z
		.array(
			z.object({
				name: z
					.string()
					.describe(
						"Human-readable color name (e.g., 'Navy Blue', 'Forest Green')"
					),
				hex: z
					.string()
					.regex(
						/^#[0-9a-fA-F]{6}$/,
						"Must be a valid 6-digit hex color code (e.g., '#000080', '#228B22')"
					)
					.describe("Hex color code (e.g., '#000080', '#228B22')"),
			})
		)
		.describe("Array of colors with both human-readable names and hex codes"),

	tags: z
		.array(
			z.object({
				type: z.string().describe(`Tag type category:
- 'item': The specific item type ('t-shirt', 'jeans', 'sneakers', 'blazer')
- 'style': Style attributes ('casual', 'formal', 'streetwear', 'minimalist', 'vintage')
- 'season': Season suitability ('summer', 'winter', 'spring', 'fall', 'all-season')
- 'material': Fabric/material ('cotton', 'denim', 'leather', 'silk', 'wool')
- 'brand': Brand name if visible ('Nike', 'Zara', 'Uniqlo')
- 'fit': Fit description ('slim-fit', 'regular', 'oversized', 'relaxed')
- 'pattern': Visual pattern ('solid', 'striped', 'floral', 'checked', 'plaid')
- 'feature': Special features ('breathable', 'waterproof', 'stretch', 'distressed')
- 'occasion': Suitable occasions ('work', 'party', 'gym', 'date-night', 'office')
- 'detail': Specific details ('crew-neck', 'v-neck', 'button-up', 'high-waisted')
- 'general': Anything that doesn't fit above categories`),
				name: z
					.string()
					.describe("The tag value (e.g., 'cotton', 'casual', 'summer')"),
			})
		)
		.describe("Comprehensive typed tags for the clothing item"),
});

export type ClothingAnalysis = z.infer<typeof ClothingAnalysisSchema>;

/**
 * System prompt for clothing image analysis - encourages flexible tagging
 */
export const CLOTHING_ANALYSIS_PROMPT = `You are an expert fashion analyst with deep knowledge of clothing, styles, and fashion trends.
Analyze the clothing item in the image and extract comprehensive metadata.

Your goal is to create a rich set of tags that fully describe this item, making it easy to search, match, and style.

Instructions:
1. **Category**: Choose the most appropriate main category (top, bottom, dress, shoes, outerwear, accessory, etc.)

2. **Colors**: List ALL visible colors as objects with both "name" and "hex" fields.
   - name: Use descriptive human-readable names ('Navy Blue', 'Forest Green', 'Burgundy')
   - hex: Provide accurate hex color codes ('#000080', '#228B22', '#800020')
   Example: {name: 'Navy Blue', hex: '#000080'}

3. **Tags**: Return tags as objects with "type" and "name" fields. Cover ALL relevant aspects:

   Tag types to use:
   - 'item': Specific item type → {type: 'item', name: 't-shirt'}, {type: 'item', name: 'sneakers'}
   - 'style': Style attributes → {type: 'style', name: 'casual'}, {type: 'style', name: 'minimalist'}
   - 'season': Season suitability → {type: 'season', name: 'summer'}, {type: 'season', name: 'all-season'}
   - 'material': Fabric/material → {type: 'material', name: 'cotton'}, {type: 'material', name: 'denim'}
   - 'brand': Brand name if visible → {type: 'brand', name: 'Nike'}
   - 'fit': Fit description → {type: 'fit', name: 'slim-fit'}, {type: 'fit', name: 'oversized'}
   - 'pattern': Visual pattern → {type: 'pattern', name: 'solid'}, {type: 'pattern', name: 'striped'}
   - 'feature': Special features → {type: 'feature', name: 'stretch'}, {type: 'feature', name: 'waterproof'}
   - 'occasion': Suitable occasions → {type: 'occasion', name: 'work'}, {type: 'occasion', name: 'party'}
   - 'detail': Specific details → {type: 'detail', name: 'v-neck'}, {type: 'detail', name: 'button-up'}
   - 'general': Anything else → {type: 'general', name: 'vintage-inspired'}

Be thorough but accurate. Create tags that would help someone find this exact type of item or style an outfit with it.
Focus on observable characteristics and common fashion terminology.`;

/**
 * Extended prompt for getting existing tags (for consistency)
 */
export const TAG_CONSISTENCY_PROMPT = `Based on these existing tags in the wardrobe, suggest which ones apply to this item:
{{existing_tags}}

Also suggest any new tags that would be appropriate for this item that aren't in the existing set.`;

/**
 * Model version for tracking
 */
export const ANALYSIS_MODEL_VERSION = "gemini-2.0-flash-exp-v1";
