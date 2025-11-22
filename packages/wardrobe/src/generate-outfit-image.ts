import type { AiClient } from "@ai-stilist/ai";
import type { Logger } from "@ai-stilist/logger";
import { WORKER_CONFIG } from "@ai-stilist/shared/constants";
import type { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";

export type ClothingItemWithMetadata = {
	id: ClothingItemId;
	processedImageKey: string;
	categories: Array<{ category: { name: string; displayName: string } }>;
	colors: Array<{ color: { name: string; hexCode: string | null } }>;
	tags: Array<{
		tag: {
			name: string;
			type: { name: string; displayName: string };
		};
	}>;
};

export type GenerateOutfitImageInput = {
	items: ClothingItemWithMetadata[];
	occasion?: string;
	style?: string;
	aiClient: AiClient;
	storageClient: StorageClient;
	logger: Logger;
	userId: UserId;
};

export type GenerateOutfitImageResult = {
	imageUrl: string;
	storageKey: string;
	prompt: string;
};

/**
 * Generate an outfit preview image using Google Gemini multimodal with reference images
 * Uses Gemini 2.5 Flash Image model with image inputs and image outputs
 */
export async function generateOutfitImage(
	input: GenerateOutfitImageInput
): Promise<GenerateOutfitImageResult> {
	const { items, occasion, style, aiClient, storageClient, logger, userId } =
		input;

	if (items.length === 0) {
		throw new Error("At least one clothing item is required");
	}

	logger.info({
		msg: "Generating outfit image with Gemini multimodal",
		itemCount: items.length,
		occasion,
		style,
		userId,
	});

	// 1. Download clothing item images as reference images
	const referenceImages = await Promise.all(
		items.map(async (item) => {
			const imageUrl = storageClient.getSignedUrl({
				key: item.processedImageKey,
				expiresIn: WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
			});

			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(
					`Failed to download image for item ${item.id}: ${response.status}`
				);
			}

			return new Uint8Array(await response.arrayBuffer());
		})
	);

	logger.debug({
		msg: "Downloaded reference images",
		count: referenceImages.length,
	});

	// 2. Build detailed text prompt from item metadata
	const textPrompt = buildOutfitPrompt({ items, occasion, style });

	logger.debug({
		msg: "Built outfit prompt",
		promptLength: textPrompt.length,
	});

	// 3. Build multimodal message content with text + reference images
	const messageContent: Array<
		{ type: "text"; text: string } | { type: "image"; image: Uint8Array }
	> = [{ type: "text", text: textPrompt }];

	// Add each reference image to the message
	for (const imageData of referenceImages) {
		messageContent.push({
			type: "image",
			image: imageData,
		});
	}

	// 4. Generate image using Gemini multimodal with image output
	try {
		const result = await aiClient.generateText({
			model: aiClient.getModel({
				provider: "google",
				modelId: "gemini-2.5-flash-image-preview",
			}),
			messages: [
				{
					role: "user",
					content: messageContent,
				},
			],
			providerOptions: {
				google: {
					responseModalities: ["IMAGE"],
				},
			},
		});

		// 5. Extract generated image from files
		const generatedImageFile = result.files?.find((file) =>
			file.mediaType?.startsWith("image/")
		);

		if (!generatedImageFile?.base64) {
			throw new Error("No image generated in response");
		}

		logger.debug({
			msg: "Image generated successfully",
			mediaType: generatedImageFile.mediaType,
		});

		// 6. Decode the base64 image data
		// The base64 property contains the image as a base64-encoded string
		const imageBuffer = Buffer.from(generatedImageFile.base64, "base64");

		// 7. Store generated image in S3
		const timestamp = Date.now();
		const storageKey = `users/${userId}/generated/outfit-${timestamp}.webp`;

		await storageClient.upload({
			key: storageKey,
			data: imageBuffer,
			contentType: "image/webp",
		});

		logger.info({
			msg: "Generated outfit image persisted to storage",
			storageKey,
		});

		// 8. Return permanent signed URL
		const imageUrl = storageClient.getSignedUrl({
			key: storageKey,
			expiresIn: 86_400, // 24 hours
		});

		return {
			imageUrl,
			storageKey,
			prompt: textPrompt,
		};
	} catch (error) {
		logger.error({
			msg: "Failed to generate outfit image",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

/**
 * Build a detailed text prompt for outfit generation from item metadata
 */
export function buildOutfitPrompt({
	items,
	occasion,
	style,
}: {
	items: ClothingItemWithMetadata[];
	occasion?: string;
	style?: string;
}): string {
	const itemDescriptions = items.map((item, index) => {
		const categories = item.categories
			.map((c) => c.category.displayName)
			.join(", ");
		const colors = item.colors.map((c) => c.color.name).join(", ");

		// Group tags by type for better organization
		const tagsByType = item.tags.reduce(
			(acc, { tag }) => {
				const typeName = tag.type.name;
				if (!acc[typeName]) {
					acc[typeName] = [];
				}
				acc[typeName].push(tag.name);
				return acc;
			},
			{} as Record<string, string[]>
		);

		// Build tag description
		const tagDescriptions = Object.entries(tagsByType)
			.map(([type, values]) => `${type}: ${values.join(", ")}`)
			.join("; ");

		return `Item ${index + 1}: ${categories} in ${colors}${tagDescriptions ? ` (${tagDescriptions})` : ""}`;
	});

	const basePrompt = `Create a photorealistic outfit visualization with the following clothing items:

${itemDescriptions.join("\n")}

Generate a clean, professional fashion flat lay or styled outfit presentation showing how these items look together as a complete outfit.`;

	const occasionText = occasion ? `\n\nOccasion: ${occasion}` : "";
	const styleText = style ? `\n\nStyle aesthetic: ${style}` : "";

	return `${basePrompt}${occasionText}${styleText}

Requirements:
- Show all items clearly and proportionally
- Professional fashion photography style
- Clean white or neutral background
- Items should be arranged as they would be worn together
- Maintain accurate colors and details from the descriptions`;
}
