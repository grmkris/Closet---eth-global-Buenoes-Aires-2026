import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import {
	clothingEmbedding,
	clothingItem,
	clothingMetadata,
} from "./clothing.db";
import { outfit, outfitItem } from "./outfits.db";
import { stylingRule } from "./styling.db";

// Clothing Item Schemas
export const insertClothingItemSchema = createInsertSchema(clothingItem);
export const selectClothingItemSchema = createSelectSchema(clothingItem);
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;
export type SelectClothingItem = z.infer<typeof selectClothingItemSchema>;

// Clothing Metadata Schemas
export const insertClothingMetadataSchema =
	createInsertSchema(clothingMetadata);
export const selectClothingMetadataSchema =
	createSelectSchema(clothingMetadata);
export type InsertClothingMetadata = z.infer<
	typeof insertClothingMetadataSchema
>;
export type SelectClothingMetadata = z.infer<
	typeof selectClothingMetadataSchema
>;

// Clothing Embedding Schemas
export const insertClothingEmbeddingSchema =
	createInsertSchema(clothingEmbedding);
export const selectClothingEmbeddingSchema =
	createSelectSchema(clothingEmbedding);
export type InsertClothingEmbedding = z.infer<
	typeof insertClothingEmbeddingSchema
>;
export type SelectClothingEmbedding = z.infer<
	typeof selectClothingEmbeddingSchema
>;

// Outfit Schemas
export const insertOutfitSchema = createInsertSchema(outfit);
export const selectOutfitSchema = createSelectSchema(outfit);
export type InsertOutfit = z.infer<typeof insertOutfitSchema>;
export type SelectOutfit = z.infer<typeof selectOutfitSchema>;

// Outfit Item Schemas
export const insertOutfitItemSchema = createInsertSchema(outfitItem);
export const selectOutfitItemSchema = createSelectSchema(outfitItem);
export type InsertOutfitItem = z.infer<typeof insertOutfitItemSchema>;
export type SelectOutfitItem = z.infer<typeof selectOutfitItemSchema>;

// Styling Rule Schemas
export const insertStylingRuleSchema = createInsertSchema(stylingRule);
export const selectStylingRuleSchema = createSelectSchema(stylingRule);
export type InsertStylingRule = z.infer<typeof insertStylingRuleSchema>;
export type SelectStylingRule = z.infer<typeof selectStylingRuleSchema>;
