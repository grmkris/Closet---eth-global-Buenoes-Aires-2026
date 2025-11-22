import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { createAiClient } from "@ai-stilist/ai";
import { createLogger } from "@ai-stilist/logger";
import { analyzeClothingImage } from "./clothing-analyzer";
import type { ClothingAnalysis } from "./metadata-schemas";

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
		".heic": "image/heic",
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
	const dataDir = path.join(import.meta.dir, "../_data");
	const folders = fs.readdirSync(dataDir);
	const images: Array<{ path: string; name: string; folder: string }> = [];

	for (const folder of folders) {
		const folderPath = path.join(dataDir, folder);
		if (!fs.statSync(folderPath).isDirectory()) {
			continue;
		}

		const files = fs.readdirSync(folderPath);
		for (const file of files) {
			const ext = path.extname(file).toLowerCase();
			if ([".jpg", ".jpeg", ".png", ".heic"].includes(ext)) {
				images.push({
					path: path.join(folderPath, file),
					name: file,
					folder,
				});
			}
		}
	}

	return images;
}

// Test configuration
const TEST_CONFIG = {
	saveResults: true,
	resultsPath: path.join(import.meta.dir, "../_data/analysis-results.json"),
	lowConfidenceThreshold: 0.7,
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
 *   tags: ["casual", "knit", "autumn", "oversized", "cotton-blend"],
 *   confidence: 0.92
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
	it("should analyze all clothing images from test data", async () => {
		// Skip if no API key available
		const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
		if (!apiKey) {
			console.warn("⚠️  Skipping test: GOOGLE_GEMINI_API_KEY not set");
			return;
		}

		// Setup AI client
		const logger = createLogger({
			environment: "dev",
		});
		const aiClient = createAiClient({
			logger,
			providerConfigs: {
				googleGeminiApiKey: apiKey,
			},
			environment: "dev",
		});

		// Load test images
		const images = loadTestImages();
		console.log(`\n📸 Found ${images.length} images to analyze\n`);

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

			console.log(
				`[${i + 1}/${images.length}] Analyzing: ${image.folder}/${image.name}`
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

				console.log(
					`  ✓ ${result.analysis.category} | ${result.analysis.colors.length} colors | ${result.analysis.tags.length} tags | confidence: ${result.analysis.confidence}`
				);
			} catch (error) {
				console.error(`  ✗ Error: ${error}`);
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
			console.log(`\n💾 Results saved to: ${TEST_CONFIG.resultsPath}`);
		}

		// Generate summary statistics
		const successful = results.filter((r) => r.analysis);
		const failed = results.filter((r) => r.error);

		console.log("\n📊 Summary Statistics:");
		console.log(`   Total images: ${results.length}`);
		console.log(`   Successful: ${successful.length}`);
		console.log(`   Failed: ${failed.length}`);

		if (successful.length > 0) {
			const avgConfidence =
				successful.reduce((sum, r) => sum + (r.analysis?.confidence || 0), 0) /
				successful.length;
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
						allTags.add(tag);
					}
				}
			}

			console.log(`   Avg confidence: ${avgConfidence.toFixed(2)}`);
			console.log(`   Avg duration: ${avgDuration.toFixed(0)}ms`);
			console.log(`   Total tokens: ${totalTokens}`);
			console.log(`   Unique categories: ${categories.size}`);
			console.log(`   Categories: ${Array.from(categories).join(", ")}`);
			console.log(`   Unique tags: ${allTags.size}`);
			console.log(
				`   Sample tags: ${Array.from(allTags).slice(0, TEST_CONFIG.sampleTagsCount).join(", ")}`
			);

			// Low confidence warnings
			const lowConfidence = successful.filter(
				(r) =>
					(r.analysis?.confidence || 0) < TEST_CONFIG.lowConfidenceThreshold
			);
			if (lowConfidence.length > 0) {
				console.log(
					`\n⚠️  ${lowConfidence.length} images with low confidence (<${TEST_CONFIG.lowConfidenceThreshold}):`
				);
				for (const result of lowConfidence) {
					console.log(
						`   - ${result.folder}/${result.filename}: ${result.analysis?.confidence}`
					);
				}
			}
		}

		console.log();

		// Basic assertion - at least some images should be analyzed successfully
		expect(successful.length).toBeGreaterThan(0);
	});
});
