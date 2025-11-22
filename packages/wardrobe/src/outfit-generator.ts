import type { AiClient } from "@ai-stilist/ai";
import type { Database } from "@ai-stilist/db";
import type {
	SelectClothingItem,
	SelectClothingMetadata,
} from "@ai-stilist/db/schema/wardrobe";
import type { Logger } from "@ai-stilist/logger";
import type { UserId } from "@ai-stilist/shared/typeid";
import { z } from "zod";
import type { StylingRulesService } from "./styling-rules";

export type OutfitGeneratorConfig = {
	db: Database;
	aiClient: AiClient;
	stylingRulesService: StylingRulesService;
	logger?: Logger;
};

export type GenerateOutfitInput = {
	userId: UserId;
	occasion?: string;
	season?: string;
	weather?: string;
	preferences?: {
		formality?: string;
		colors?: string[];
	};
};

export type OutfitSuggestion = {
	items: Array<{
		itemId: string;
		category: string;
		reason: string;
	}>;
	description: string;
	occasion: string;
};

const OutfitSuggestionsSchema = z.object({
	outfits: z.array(
		z.object({
			items: z.array(
				z.object({
					itemId: z.string(),
					category: z.string(),
					reason: z.string(),
				})
			),
			description: z.string(),
			occasion: z.string(),
		})
	),
});

export function createOutfitGenerator(config: OutfitGeneratorConfig) {
	const { db, aiClient, stylingRulesService, logger } = config;

	/**
	 * Get user's ready wardrobe items with metadata
	 */
	async function getUserWardrobeItems(userId: UserId) {
		return await db.query.clothingItem.findMany({
			where: (item, { eq, and }) =>
				and(eq(item.userId, userId), eq(item.status, "ready")),
			with: {
				metadata: true,
			},
		});
	}

	/**
	 * Filter items by criteria
	 */
	function filterItems(params: {
		items: Array<SelectClothingItem & { metadata: SelectClothingMetadata | null }>;
		filters: {
			season?: string;
			formality?: string;
			occasion?: string;
		};
	}) {
		const { items, filters } = params;

		return items.filter((item) => {
			if (!item.metadata) {
				return false;
			}

			// Filter by season
			if (filters.season && !item.metadata.seasons.includes(filters.season)) {
				return false;
			}

			// Filter by formality
			if (filters.formality && item.metadata.formality !== filters.formality) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Generate outfit suggestions using AI
	 */
	async function generateOutfits(
		input: GenerateOutfitInput
	): Promise<OutfitSuggestion[]> {
		const { userId, occasion, season, weather, preferences } = input;

		logger?.info({ msg: "Generating outfits", userId, occasion, season });

		try {
			// 1. Load user's wardrobe
			const wardrobeItems = await getUserWardrobeItems(userId);

			if (wardrobeItems.length === 0) {
				logger?.warn({ msg: "No wardrobe items found", userId });
				return [];
			}

			// 2. Filter items by criteria
			const filteredItems = filterItems({
				items: wardrobeItems,
				filters: {
					season,
					formality: preferences?.formality,
					occasion,
				},
			});

			if (filteredItems.length === 0) {
				logger?.warn({ msg: "No items match criteria", userId });
				return [];
			}

			// 3. Load styling rules
			const rules = await stylingRulesService.getActiveRules();

			// 4. Build AI prompt with filtered items and rules
			const itemsDescription = filteredItems.map((item) => ({
				id: item.id,
				category: item.metadata?.category,
				subcategory: item.metadata?.subcategory,
				colors: item.metadata?.colors,
				formality: item.metadata?.formality,
				patterns: item.metadata?.patterns,
				styleTags: item.metadata?.styleTags,
			}));

			const rulesDescription = rules.map((rule) => ({
				name: rule.name,
				description: rule.description,
				type: rule.ruleType,
			}));

			const prompt = `You are an expert fashion stylist. Create outfit combinations from the available clothing items.

User Context:
- Occasion: ${occasion || "not specified"}
- Season: ${season || "not specified"}
- Weather: ${weather || "not specified"}
- Preferences: ${JSON.stringify(preferences || {})}

Available Items:
${JSON.stringify(itemsDescription, null, 2)}

Styling Rules:
${JSON.stringify(rulesDescription, null, 2)}

Create 3-5 outfit combinations that:
- Follow the styling rules
- Match the occasion and season
- Have good color coordination
- Balance formality levels
- Create cohesive looks

For each outfit, explain why the pieces work together.`;

			// 5. Call AI to generate outfits
			const result = await aiClient.generateObject({
				model: aiClient.getModel({
					provider: "google",
					modelId: "gemini-2.0-flash-exp",
				}),
				schema: OutfitSuggestionsSchema,
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.7, // Higher temperature for creativity
			});

			logger?.info({
				msg: "Outfits generated",
				count: result.object.outfits.length,
			});

			return result.object.outfits;
		} catch (error) {
			logger?.error({ msg: "Outfit generation failed", userId, error });
			throw new Error("Failed to generate outfits");
		}
	}

	return {
		generateOutfits,
		getUserWardrobeItems,
	};
}

export type OutfitGenerator = ReturnType<typeof createOutfitGenerator>;
