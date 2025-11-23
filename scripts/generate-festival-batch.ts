#!/usr/bin/env bun

import { mkdir, writeFile, copyFile } from "node:fs/promises"
import { join } from "node:path"
import type { AspectRatio, ImageSize } from "@ai-stilist/shared/constants"
import { createAiClient } from "../packages/ai/src/ai-client.ts"
import { createLogger } from "../packages/logger/src/logger.ts"
import { festivalItems } from "./festival-items.ts"

type GenerateImageInput = {
	prompt: string
	aspectRatio?: AspectRatio
	imageSize?: ImageSize
}

type GenerateImageResult = {
	filePath: string
	prompt: string
}

async function generateImage({
	prompt,
	aspectRatio = "3:4",
	imageSize = "2K",
}: GenerateImageInput): Promise<GenerateImageResult> {
	const logger = createLogger({
		name: "generate-festival-batch",
		level: "info",
	})

	logger.info({
		msg: "Generating image with Gemini 2.5 Flash Image",
		prompt,
		aspectRatio,
		imageSize,
	})

	const aiClient = createAiClient({
		logger,
		providerConfigs: {
			googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "",
			anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
			groqApiKey: process.env.GROQ_API_KEY ?? "",
			xaiApiKey: process.env.XAI_API_KEY ?? "",
		},
		environment: "dev",
	})

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
		})

		if (!result.files || result.files.length === 0) {
			throw new Error(
				"No files returned in response. Ensure the model supports image generation.",
			)
		}

		const generatedImageFile = result.files.find((file) =>
			file.mediaType?.startsWith("image/"),
		)

		if (!generatedImageFile?.base64) {
			throw new Error(
				`No image found in response. Received ${result.files.length} file(s)`,
			)
		}

		const imageBuffer = Buffer.from(generatedImageFile.base64, "base64")

		// Ensure output directory exists
		const outputDir = join(import.meta.dir, "generated-images")
		await mkdir(outputDir, { recursive: true })

		// Save to local filesystem
		const timestamp = Date.now()
		const fileName = `generated-${timestamp}.webp`
		const filePath = join(outputDir, fileName)

		await writeFile(filePath, imageBuffer)

		logger.info({
			msg: "Generated image saved to local filesystem",
			filePath,
		})

		return {
			filePath,
			prompt,
		}
	} catch (error) {
		logger.error({
			msg: "Failed to generate image",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		})
		throw error
	}
}

async function main() {
	const logger = createLogger({
		name: "generate-festival-batch",
		level: "info",
	})

	logger.info({
		msg: "Starting festival outfit batch generation",
		totalItems: festivalItems.length,
	})

	// Ensure public directory exists
	const publicDir = join(
		import.meta.dir,
		"../apps/marketplace-server/public/festival-items",
	)
	await mkdir(publicDir, { recursive: true })

	const results: Array<{
		item: (typeof festivalItems)[0]
		imagePath: string
		publicPath: string
	}> = []

	for (const [index, item] of festivalItems.entries()) {
		try {
			logger.info({
				msg: `Generating image ${index + 1}/${festivalItems.length}`,
				itemId: item.id,
				itemName: item.name,
			})

			// Generate image
			const result = await generateImage({
				prompt: item.prompt,
				aspectRatio: "3:4",
				imageSize: "2K",
			})

			// Copy to public directory with item ID as filename
			const publicFileName = `${item.id}.webp`
			const publicPath = join(publicDir, publicFileName)
			await copyFile(result.filePath, publicPath)

			logger.info({
				msg: "Image copied to public directory",
				publicPath,
			})

			results.push({
				item,
				imagePath: result.filePath,
				publicPath: `/festival-items/${publicFileName}`,
			})

			// Rate limiting - wait 2 seconds between generations
			if (index < festivalItems.length - 1) {
				logger.info({ msg: "Waiting 2 seconds before next generation..." })
				await new Promise((resolve) => setTimeout(resolve, 2000))
			}
		} catch (error) {
			logger.error({
				msg: "Failed to generate image for item",
				itemId: item.id,
				itemName: item.name,
				error: error instanceof Error ? error.message : String(error),
			})
			// Continue with next item instead of failing completely
		}
	}

	// Create metadata file
	const metadata = {
		generatedAt: new Date().toISOString(),
		totalItems: festivalItems.length,
		successfulGenerations: results.length,
		theme: {
			name: "Festival/Rave Collection",
			colors: ["red", "yellow", "purple", "orange"],
			style: ["rave", "festival", "neon", "holographic"],
		},
		items: results.map((r) => ({
			id: r.item.id,
			name: r.item.name,
			category: r.item.category,
			colors: r.item.colors,
			style: r.item.style,
			gender: r.item.gender,
			imageUrl: r.publicPath,
			localPath: r.imagePath,
		})),
	}

	const metadataPath = join(publicDir, "items.json")
	await writeFile(metadataPath, JSON.stringify(metadata, null, 2))

	logger.info({
		msg: "Metadata file created",
		path: metadataPath,
	})

	console.log("\n✓ Festival outfit batch generation complete!")
	console.log(`  Generated: ${results.length}/${festivalItems.length} items`)
	console.log(`  Metadata: ${metadataPath}`)
	console.log(`  Public directory: ${publicDir}\n`)

	if (results.length < festivalItems.length) {
		console.log(
			`⚠ Warning: ${festivalItems.length - results.length} items failed to generate`,
		)
	}
}

main().catch((error) => {
	console.error(
		"\n✗ Error:",
		error instanceof Error ? error.message : String(error),
	)
	process.exit(1)
})
