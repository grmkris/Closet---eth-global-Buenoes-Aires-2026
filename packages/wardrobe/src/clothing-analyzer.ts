import type { AiClient } from "@ai-stilist/ai";
import type { Logger } from "@ai-stilist/logger";
import {
	ANALYSIS_MODEL_VERSION,
	CLOTHING_ANALYSIS_PROMPT,
	type ClothingAnalysis,
	ClothingAnalysisSchema,
} from "./metadata-schemas";

export type AnalyzeClothingImageInput = {
	imageUrl: string;
	aiClient: AiClient;
	logger?: Logger;
	existingTags?: string[]; // Optional: pass existing tags for consistency
};

export type AnalyzeClothingImageResult = {
	analysis: ClothingAnalysis;
	modelVersion: string;
	tokensUsed?: number;
	durationMs: number;
};

/**
 * Analyze a clothing image using AI vision model (Gemini 2.0 Flash)
 * Returns flexible tags and categories without rigid constraints
 */
export async function analyzeClothingImage(
	input: AnalyzeClothingImageInput
): Promise<AnalyzeClothingImageResult> {
	const { imageUrl, aiClient, logger, existingTags } = input;

	const startTime = Date.now();

	try {
		logger?.info({ msg: "Analyzing clothing image", imageUrl });

		// Build prompt with optional existing tags context
		let prompt = CLOTHING_ANALYSIS_PROMPT;
		if (existingTags && existingTags.length > 0) {
			const uniqueTags = [...new Set(existingTags)].sort();
			prompt += `\n\nExisting tags in wardrobe for consistency:\n${uniqueTags.join(", ")}\n\nFeel free to reuse these tags where appropriate, but also create new ones as needed.`;
		}

		// Use Gemini 2.0 Flash for image analysis
		const result = await aiClient.generateObject({
			model: aiClient.getModel({
				provider: "google",
				modelId: "gemini-2.0-flash-exp",
			}),
			schema: ClothingAnalysisSchema,
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: prompt },
						{ type: "image", image: imageUrl },
					],
				},
			],
			temperature: 0.3, // Lower temperature for more consistent results
		});

		const durationMs = Date.now() - startTime;

		logger?.info({
			msg: "Clothing analysis complete",
			durationMs,
			confidence: result.object.confidence,
			tagCount: result.object.tags.length,
			category: result.object.category,
		});

		return {
			analysis: result.object,
			modelVersion: ANALYSIS_MODEL_VERSION,
			tokensUsed: result.usage?.totalTokens,
			durationMs,
		};
	} catch (error) {
		const durationMs = Date.now() - startTime;

		logger?.error({
			msg: "Clothing analysis failed",
			imageUrl,
			durationMs,
			error,
		});

		throw new Error("Failed to analyze clothing image");
	}
}
