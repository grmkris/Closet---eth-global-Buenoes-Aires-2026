import { eq, inArray } from "@ai-stilist/db/drizzle";
import {
	clothingMetadata,
	outfit,
	outfitItem,
} from "@ai-stilist/db/schema/wardrobe";
import {
	ClothingItemId,
	OutfitId,
	typeIdGenerator,
	UserId,
} from "@ai-stilist/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../index";

// Input schemas
const SaveOutfitInput = z.object({
	name: z.string().optional(),
	itemIds: z.array(ClothingItemId).min(1),
	occasion: z.string(),
	season: z.string().optional(),
	aiGenerated: z.boolean().default(true),
	generationPrompt: z.string().optional(),
});

const GetOutfitInput = z.object({
	outfitId: OutfitId,
});

const DeleteOutfitInput = z.object({
	outfitId: OutfitId,
});

export const outfitsRouter = {
	/**
	 * Save an outfit
	 */
	saveOutfit: protectedProcedure
		.input(SaveOutfitInput)
		.handler(async ({ input, context }) => {
			const { name, itemIds, occasion, season, aiGenerated, generationPrompt } =
				input;
			const userId = UserId.parse(context.session.user.id);

			// Fetch metadata for all items to determine slots
			const itemsMetadata = await context.db
				.select({
					itemId: clothingMetadata.itemId,
					category: clothingMetadata.category,
				})
				.from(clothingMetadata)
				.where(inArray(clothingMetadata.itemId, itemIds));

			// Create a map of itemId -> category for quick lookup
			const itemCategoryMap = new Map(
				itemsMetadata.map((m) => [m.itemId, m.category])
			);

			// Create outfit
			const outfitId = typeIdGenerator("outfit");

			await context.db.insert(outfit).values({
				id: outfitId,
				userId,
				name,
				occasion,
				season,
				aiGenerated,
				generationPrompt,
			});

			// Add outfit items with proper slots determined by category
			await context.db.insert(outfitItem).values(
				itemIds.map((itemId, index) => {
					const category = itemCategoryMap.get(itemId as ClothingItemId);
					// Category maps directly to slot (both use same enum values)
					// Default to "top" if metadata not found (shouldn't happen in normal flow)
					const slot = category || "top";

					return {
						outfitId,
						itemId,
						slot,
						order: index,
					};
				})
			);

			context.logger.info({ msg: "Outfit saved", outfitId, userId });

			return {
				outfitId,
			};
		}),

	/**
	 * Get all saved outfits for user
	 */
	getOutfits: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		const outfits = await context.db.query.outfit.findMany({
			where: eq(outfit.userId, userId),
			with: {
				items: {
					with: {
						clothingItem: {
							with: {
								metadata: true,
							},
						},
					},
				},
			},
		});

		// Generate signed URLs for images
		const outfitsWithUrls = outfits.map((o) => ({
			...o,
			items: o.items.map((item) => ({
				...item,
				clothingItem: {
					...item.clothingItem,
					imageUrl: context.storage.getSignedUrl({
						key: item.clothingItem.imageKey,
						expiresIn: 3600,
					}),
				},
			})),
		}));

		return {
			outfits: outfitsWithUrls,
		};
	}),

	/**
	 * Get single outfit with details
	 */
	getOutfit: protectedProcedure
		.input(GetOutfitInput)
		.handler(async ({ input, context }) => {
			const { outfitId } = input;
			const userId = UserId.parse(context.session.user.id);

			const outfitData = await context.db.query.outfit.findFirst({
				where: eq(outfit.id, outfitId),
				with: {
					items: {
						with: {
							clothingItem: {
								with: {
									metadata: true,
								},
							},
						},
					},
				},
			});

			if (!outfitData || outfitData.userId !== userId) {
				throw new Error("Outfit not found");
			}

			// Generate signed URLs for images
			const outfitWithUrls = {
				...outfitData,
				items: outfitData.items.map((item) => ({
					...item,
					clothingItem: {
						...item.clothingItem,
						imageUrl: context.storage.getSignedUrl({
							key: item.clothingItem.imageKey,
							expiresIn: 3600,
						}),
					},
				})),
			};

			return outfitWithUrls;
		}),

	/**
	 * Delete outfit
	 */
	deleteOutfit: protectedProcedure
		.input(DeleteOutfitInput)
		.handler(async ({ input, context }) => {
			const { outfitId } = input;
			const userId = UserId.parse(context.session.user.id);

			// Verify outfit belongs to user
			const outfitData = await context.db.query.outfit.findFirst({
				where: eq(outfit.id, outfitId),
			});

			if (!outfitData || outfitData.userId !== userId) {
				throw new Error("Outfit not found");
			}

			// Delete outfit (cascade will handle outfit_items)
			await context.db.delete(outfit).where(eq(outfit.id, outfitId));

			context.logger.info({ msg: "Outfit deleted", outfitId });

			return {
				success: true,
			};
		}),
};
