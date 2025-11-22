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
		.array(z.string())
		.describe(
			"Array of colors - can be names ('navy', 'white') or hex codes ('#FF5733')"
		),

	tags: z.array(z.string()).describe(`Comprehensive tags including:
		- Type: 't-shirt', 'jeans', 'sneakers', 'blazer'
		- Style: 'casual', 'formal', 'streetwear', 'minimalist', 'vintage'
		- Season: 'summer', 'winter', 'all-season'
		- Material: 'cotton', 'denim', 'leather', 'silk'
		- Brand: 'Nike', 'Zara', 'Uniqlo'
		- Fit: 'slim', 'regular', 'oversized'
		- Pattern: 'solid', 'striped', 'floral', 'checked'
		- Features: 'breathable', 'waterproof', 'stretch'
		- Occasion: 'work', 'party', 'gym', 'date-night'
		- Details: 'crew-neck', 'v-neck', 'button-up', 'high-waisted'`),

	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("AI confidence score for this analysis (0-1)"),
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

2. **Colors**: List ALL visible colors. Use common color names when possible ('navy', 'forest green', 'burgundy'), or hex codes for precise colors.

3. **Tags**: Create comprehensive tags covering ALL aspects:
   - Specific type (e.g., 'crew-neck-tshirt', 'high-top-sneakers', 'midi-dress')
   - Style attributes ('casual', 'business-casual', 'athleisure', 'bohemian')
   - Season suitability ('summer', 'winter', 'transitional', 'all-season')
   - Material if identifiable ('cotton', 'denim', 'knit', 'leather')
   - Brand if visible
   - Fit description ('slim-fit', 'relaxed', 'tailored', 'oversized')
   - Patterns ('solid', 'striped', 'geometric', 'abstract')
   - Special features ('moisture-wicking', 'stretch', 'distressed')
   - Suitable occasions ('office', 'weekend', 'formal-event', 'workout')
   - Specific details ('button-front', 'zipper-closure', 'elastic-waist')

4. **Confidence**: Rate your confidence in the analysis (0.0 to 1.0)

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
