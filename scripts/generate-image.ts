#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AspectRatio, ImageSize } from "@ai-stilist/shared/constants";
import { createAiClient } from "../packages/ai/src/ai-client.ts";
import { createLogger } from "../packages/logger/src/logger.ts";

type GenerateImageInput = {
	prompt: string;
	aspectRatio?: AspectRatio;
	imageSize?: ImageSize;
};

type GenerateImageResult = {
	filePath: string;
	prompt: string;
};

async function generateImage({
	prompt,
	aspectRatio = "1:1",
	imageSize = "1K",
}: GenerateImageInput): Promise<GenerateImageResult> {
	const logger = createLogger({
		name: "generate-image",
		level: "info",
	});

	logger.info({
		msg: "Generating image with Gemini 2.5 Flash Image",
		prompt,
		aspectRatio,
		imageSize,
	});

	// Initialize AI client
	const aiClient = createAiClient({
		logger,
		providerConfigs: {
			googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "",
			anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
			groqApiKey: process.env.GROQ_API_KEY ?? "",
			xaiApiKey: process.env.XAI_API_KEY ?? "",
		},
		environment: "dev",
	});

	// Generate image using Gemini 2.5 Flash Image
	try {
		const result = await aiClient.generateText({
			model: aiClient.getModel({
				provider: "google",
				modelId: "gemini-3-pro-image-preview",
			}),
			messages: [
				{
					role: "user",
					content: [{ type: "text", text: prompt }],
				},
			],
			providerOptions: {
				google: {
					aspectRatio,
					...(imageSize && { imageSize }),
				},
			},
		});

		// Extract generated image from files
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

		// Decode the base64 image data
		const imageBuffer = Buffer.from(generatedImageFile.base64, "base64");

		// Ensure output directory exists
		const outputDir = join(import.meta.dir, "generated-images");
		await mkdir(outputDir, { recursive: true });

		// Save to local filesystem
		const timestamp = Date.now();
		const fileName = `generated-${timestamp}.webp`;
		const filePath = join(outputDir, fileName);

		await writeFile(filePath, imageBuffer);

		logger.info({
			msg: "Generated image saved to local filesystem",
			filePath,
		});

		return {
			filePath,
			prompt,
		};
	} catch (error) {
		logger.error({
			msg: "Failed to generate image",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			aspectRatio,
			imageSize,
		});
		throw error;
	}
}

// CLI argument parsing
function parseArgs(): GenerateImageInput {
	const args = process.argv.slice(2);
	const parsed: GenerateImageInput = {
		prompt: "",
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		switch (arg) {
			case "--prompt":
			case "-p":
				if (!nextArg) {
					throw new Error("--prompt requires a value");
				}
				parsed.prompt = nextArg;
				i++;
				break;
			case "--aspect-ratio":
			case "-a":
				if (!nextArg) {
					throw new Error("--aspect-ratio requires a value");
				}
				parsed.aspectRatio = nextArg as AspectRatio;
				i++;
				break;
			case "--image-size":
			case "-s":
				if (!nextArg) {
					throw new Error("--image-size requires a value");
				}
				parsed.imageSize = nextArg as ImageSize;
				i++;
				break;
			case "--help":
			case "-h":
				console.log(`
Usage: bun scripts/generate-image.ts [options]

Options:
  --prompt, -p <text>           Image generation prompt (required)
  --aspect-ratio, -a <ratio>    Aspect ratio: 1:1, 3:4, 4:3, 9:16, 16:9 (default: 1:1)
  --image-size, -s <size>       Image size: 1K, 2K, 4K (default: 1K)
  --help, -h                    Show this help message

Examples:
  bun scripts/generate-image.ts --prompt "A stylish summer outfit with blue jeans"
  bun scripts/generate-image.ts -p "Elegant evening dress" -a "3:4" -s "2K"
				`);
				process.exit(0);
				break;
			default:
				// Skip unknown args
				break;
		}
	}

	if (!parsed.prompt) {
		throw new Error("--prompt is required. Use --help for usage information.");
	}

	return parsed;
}

// Main execution
async function main() {
	try {
		const args = parseArgs();
		const result = await generateImage(args);

		console.log("\n✓ Image generated successfully!");
		console.log(`  File: ${result.filePath}`);
		console.log(`  Prompt: ${result.prompt}\n`);
	} catch (error) {
		console.error(
			"\n✗ Error:",
			error instanceof Error ? error.message : String(error)
		);
		process.exit(1);
	}
}

main();
