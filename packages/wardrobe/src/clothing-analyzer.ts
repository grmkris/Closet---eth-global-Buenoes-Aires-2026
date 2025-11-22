import type { AiClient } from "@ai-stilist/ai";
import type { Logger } from "@ai-stilist/logger";
import {
	CLOTHING_ANALYSIS_PROMPT,
	type ClothingMetadata,
	ClothingMetadataSchema,
} from "./metadata-schemas";

export type AnalyzeClothingImageInput = {
	imageUrl: string;
	aiClient: AiClient;
	logger?: Logger;
};

export type AnalyzeClothingImageResult = {
	metadata: ClothingMetadata;
	tokensUsed?: number;
	durationMs: number;
};

/**
 * Analyze a clothing image using AI vision model (Gemini 2.0 Flash)
 * Extracts structured metadata about the clothing item
 */
export async function analyzeClothingImage(
	input: AnalyzeClothingImageInput
): Promise<AnalyzeClothingImageResult> {
	const { imageUrl, aiClient, logger } = input;

	const startTime = Date.now();

	try {
		logger?.info({ msg: "Analyzing clothing image", imageUrl });

		// Use Gemini 2.0 Flash for image analysis
		const result = await aiClient.generateObject({
			model: aiClient.getModel({
				provider: "google",
				modelId: "gemini-2.0-flash-exp",
			}),
			schema: ClothingMetadataSchema,
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: CLOTHING_ANALYSIS_PROMPT },
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
		});

		return {
			metadata: result.object,
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
