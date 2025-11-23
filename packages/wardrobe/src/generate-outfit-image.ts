import type { AiClient } from "@ai-stilist/ai";
import type { Logger } from "@ai-stilist/logger";
import {
	type AspectRatio,
	OUTFIT_IMAGE_CONFIG,
	WORKER_CONFIG,
} from "@ai-stilist/shared/constants";
import type { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";

// Image size options for Gemini 3 Pro Image
export type ImageSize = "1K" | "2K" | "4K";

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
	aspectRatio: AspectRatio;
	imageSize?: ImageSize;
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
 * Generate an outfit preview image using Gemini 2.5 Flash Image
 * Uses Gemini multimodal model with image inputs and image outputs
 */
export async function generateOutfitImage(
	input: GenerateOutfitImageInput
): Promise<GenerateOutfitImageResult> {
	const {
		items,
		occasion,
		style,
		aspectRatio,
		imageSize,
		aiClient,
		storageClient,
		logger,
		userId,
	} = input;

	if (items.length === 0) {
		throw new Error("At least one clothing item is required");
	}

	logger.info({
		msg: "Generating outfit image with Gemini 3 Pro Image Preview",
		itemCount: items.length,
		occasion,
		style,
		aspectRatio,
		imageSize,
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

			// Convert to Buffer for file type input
			return Buffer.from(await response.arrayBuffer());
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
		| { type: "text"; text: string }
		| { type: "file"; mediaType: string; data: Buffer }
	> = [{ type: "text", text: textPrompt }];

	// Add each reference image to the message using file type
	for (const imageData of referenceImages) {
		messageContent.push({
			type: "file",
			mediaType: "image/webp",
			data: imageData,
		});
	}

	// 4. Generate image using Gemini 2.5 Flash Image with multimodal input
	try {
		const result = await aiClient.generateText({
			model: aiClient.getModel({
				provider: "google",
				modelId: "gemini-3-pro-image-preview",
			}),
			messages: [
				{
					role: "user",
					content: messageContent,
				},
			],
			providerOptions: {
				google: {
					aspectRatio,
					...(imageSize && { imageSize }),
				},
			},
		});

		// 5. Extract generated image from files
		if (!result.files || result.files.length === 0) {
			throw new Error(
				"No files returned in response. Ensure the model supports image generation."
			);
		}

		const generatedImageFile = result.files.find((file) =>
			file.mediaType?.startsWith("image/")
		);

		if (!generatedImageFile?.base64) {
			throw new Error(
				`No image found in response. Received ${result.files.length} file(s) with media types: ${result.files.map((f) => f.mediaType).join(", ")}`
			);
		}

		logger.debug({
			msg: "Image generated successfully",
			mediaType: generatedImageFile.mediaType,
			fileCount: result.files.length,
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

		// 8. Return signed URL
		const imageUrl = storageClient.getSignedUrl({
			key: storageKey,
			expiresIn: OUTFIT_IMAGE_CONFIG.OUTPUT_EXPIRY_SECONDS,
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
			aspectRatio,
			imageSize,
			itemCount: items.length,
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
