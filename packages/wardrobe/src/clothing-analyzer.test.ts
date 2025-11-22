import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { createAiClient } from "@ai-stilist/ai";
import { createLogger } from "@ai-stilist/logger";
import { env } from "bun";
import z from "zod";
import { analyzeClothingImage } from "./clothing-analyzer";
import type { ClothingAnalysis } from "./metadata-schemas";

const testEnvSchema = z.object({
	GOOGLE_GEMINI_API_KEY: z.string(),
});
const MAX_TEST_TIME = 100_000;
const MAX_IMAGES_PER_FOLDER = 5;
const testEnv = testEnvSchema.parse(env);

// Helper to convert image to base64 data URL
function imageToDataUrl(filePath: string): string {
	const imageBuffer = fs.readFileSync(filePath);
	const base64 = imageBuffer.toString("base64");
	const ext = path.extname(filePath).toLowerCase();

	// Map file extensions to MIME types
	const mimeTypes: Record<string, string> = {
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
	};

	const mimeType = mimeTypes[ext] || "image/jpeg";
	return `data:${mimeType};base64,${base64}`;
}

// Helper to load all test images
function loadTestImages(): Array<{
	path: string;
	name: string;
	folder: string;
}> {
	const dataDir = path.join(process.cwd(), "_data");
	const folders = fs.readdirSync(dataDir);
	const images: Array<{ path: string; name: string; folder: string }> = [];

	for (const folder of folders) {
		const folderPath = path.join(dataDir, folder);
		if (!fs.statSync(folderPath).isDirectory()) {
			continue;
		}

		const files = fs.readdirSync(folderPath);
		const folderImages: Array<{ path: string; name: string; folder: string }> =
			[];
		for (const file of files) {
			const ext = path.extname(file).toLowerCase();
			if ([".jpg", ".jpeg", ".png"].includes(ext)) {
				folderImages.push({
					path: path.join(folderPath, file),
					name: file,
					folder,
				});
			}
		}
		// Take only first 5 from each folder
		images.push(...folderImages.slice(0, MAX_IMAGES_PER_FOLDER));
	}

	return images;
}

// Test configuration
const TEST_CONFIG = {
	saveResults: true,
	resultsPath: path.join(import.meta.dir, "../_data/analysis-results.json"),
	sampleTagsCount: 20,
};

/**
 * DB Schema Mapping Guide
 *
 * This demonstrates how AI analysis results map to the normalized database schema.
 *
 * AI Output -> DB Tables:
 *
 * 1. analysis.category -> categoriesTable
 *    - Normalize category name (lowercase)
 *    - Create displayName (capitalized)
 *    - Store in categoriesTable, link via clothingItemCategoriesTable
 *
 * 2. analysis.colors -> colorsTable
 *    - Extract color names and hex codes
 *    - Normalize names (lowercase)
 *    - Detect hex patterns (#RRGGBB)
 *    - Store in colorsTable, link via clothingItemColorsTable with order
 *
 * 3. analysis.tags -> tagsTable + tagTypesTable
 *    - Classify tags by type (style, season, material, fit, pattern, etc.)
 *    - Create/find tag type in tagTypesTable
 *    - Store tag in tagsTable with typeId
 *    - Link via clothingItemTagsTable with source='ai'
 *    - Increment usageCount on existing tags
 *
 * Example transformation:
 * ```typescript
 * const analysis = {
 *   category: "sweater",
 *   colors: ["beige", "#D4C5B0", "tan"],
 *   tags: ["casual", "knit", "autumn", "oversized", "cotton-blend"]
 * };
 *
 * // DB Operations:
 * // 1. Find/create category
 * const category = await db.insert(categoriesTable).values({
 *   name: "sweater",
 *   displayName: "Sweater"
 * }).onConflictDoNothing();
 *
 * // 2. Process colors (beige, tan + hex)
 * const colors = [
 *   { name: "beige", hexCode: "#D4C5B0" },
 *   { name: "tan", hexCode: null }
 * ];
 * for (const color of colors) {
 *   await db.insert(colorsTable).values(color).onConflictDoNothing();
 * }
 *
 * // 3. Classify and store tags
 * const tagsByType = {
 *   style: ["casual", "oversized"],
 *   material: ["knit", "cotton-blend"],
 *   season: ["autumn"]
 * };
 * for (const [typeName, tagNames] of Object.entries(tagsByType)) {
 *   const tagType = await findOrCreateTagType(typeName);
 *   for (const tagName of tagNames) {
 *     await findOrCreateTag(tagName, tagType.id);
 *   }
 * }
 * ```
 */

describe("Clothing Analyzer", () => {
	it(
		"should analyze all clothing images from test data",
		async () => {
			// Setup AI client
			// Use 'warn' level to suppress verbose info logs (especially base64 image data)
			const logger = createLogger({
				level: "debug",
			});
			const aiClient = createAiClient({
				logger,
				providerConfigs: {
					googleGeminiApiKey: testEnv.GOOGLE_GEMINI_API_KEY,
				},
				environment: "dev",
			});

			// Load test images
			const images = loadTestImages();
			logger.info(`Found ${images.length} images to analyze`);

			// Results storage
			const results: Array<{
				filename: string;
				folder: string;
				path: string;
				analysis?: ClothingAnalysis;
				modelVersion?: string;
				tokensUsed?: number;
				durationMs?: number;
				error?: string;
			}> = [];

			// Process each image
			for (let i = 0; i < images.length; i += 1) {
				const image = images[i];
				if (!image) {
					continue;
				}

				logger.info(
					`Analyzing [${i + 1}/${images.length}]: ${image.folder}/${image.name}`
				);

				try {
					// Convert to data URL
					const dataUrl = imageToDataUrl(image.path);

					// Analyze
					const result = await analyzeClothingImage({
						imageUrl: dataUrl,
						aiClient,
						logger,
					});

					// Store result
					results.push({
						filename: image.name,
						folder: image.folder,
						path: image.path,
						analysis: result.analysis,
						modelVersion: result.modelVersion,
						tokensUsed: result.tokensUsed,
						durationMs: result.durationMs,
					});

					logger.info({
						msg: "Analysis complete",
						category: result.analysis.category,
						colorCount: result.analysis.colors.length,
						tagCount: result.analysis.tags.length,
					});
				} catch (error) {
					logger.error({ msg: "Analysis failed", error });
					results.push({
						filename: image.name,
						folder: image.folder,
						path: image.path,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Save results if configured
			if (TEST_CONFIG.saveResults) {
				fs.writeFileSync(
					TEST_CONFIG.resultsPath,
					JSON.stringify(results, null, 2)
				);
				logger.info(`Results saved to: ${TEST_CONFIG.resultsPath}`);
			}

			// Generate summary statistics
			const successful = results.filter((r) => r.analysis);
			const failed = results.filter((r) => r.error);

			logger.info({
				msg: "Summary Statistics",
				totalImages: results.length,
				successful: successful.length,
				failed: failed.length,
			});

			if (successful.length > 0) {
				const avgDuration =
					successful.reduce((sum, r) => sum + (r.durationMs || 0), 0) /
					successful.length;
				const totalTokens = successful.reduce(
					(sum, r) => sum + (r.tokensUsed || 0),
					0
				);

				// Collect unique categories and tags
				const categories = new Set<string>();
				const allTags = new Set<string>();

				for (const result of successful) {
					if (result.analysis) {
						categories.add(result.analysis.category);
						for (const tag of result.analysis.tags) {
							allTags.add(`${tag.type}:${tag.name}`);
						}
					}
				}

				logger.info({
					msg: "Analysis Details",
					avgDurationMs: Math.round(avgDuration),
					totalTokens,
					uniqueCategories: categories.size,
					categories: Array.from(categories),
					uniqueTags: allTags.size,
					sampleTags: Array.from(allTags).slice(0, TEST_CONFIG.sampleTagsCount),
				});
			}

			// Basic assertion - at least some images should be analyzed successfully
			expect(successful.length).toBeGreaterThan(0);
		},
		MAX_TEST_TIME
	);
});
