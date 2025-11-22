import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import {
	clothingEmbedding,
	clothingItem,
	clothingMetadata,
} from "./clothing.db";
import { outfit, outfitItem } from "./outfits.db";
import { stylingRule } from "./styling.db";

// User relations
export const userWardrobeRelations = relations(user, ({ many }) => ({
	clothingItems: many(clothingItem),
	outfits: many(outfit),
	createdStylingRules: many(stylingRule),
}));

// Clothing Item relations
export const clothingItemRelations = relations(clothingItem, ({ one, many }) => ({
	user: one(user, {
		fields: [clothingItem.userId],
		references: [user.id],
	}),
	metadata: one(clothingMetadata, {
		fields: [clothingItem.id],
		references: [clothingMetadata.itemId],
	}),
	embedding: one(clothingEmbedding, {
		fields: [clothingItem.id],
		references: [clothingEmbedding.itemId],
	}),
	outfitItems: many(outfitItem),
}));

// Clothing Metadata relations
export const clothingMetadataRelations = relations(clothingMetadata, ({ one }) => ({
	item: one(clothingItem, {
		fields: [clothingMetadata.itemId],
		references: [clothingItem.id],
	}),
}));

// Clothing Embedding relations
export const clothingEmbeddingRelations = relations(clothingEmbedding, ({ one }) => ({
	item: one(clothingItem, {
		fields: [clothingEmbedding.itemId],
		references: [clothingItem.id],
	}),
}));

// Outfit relations
export const outfitRelations = relations(outfit, ({ one, many }) => ({
	user: one(user, {
		fields: [outfit.userId],
		references: [user.id],
	}),
	items: many(outfitItem),
}));

// Outfit Item relations
export const outfitItemRelations = relations(outfitItem, ({ one }) => ({
	outfit: one(outfit, {
		fields: [outfitItem.outfitId],
		references: [outfit.id],
	}),
	clothingItem: one(clothingItem, {
		fields: [outfitItem.itemId],
		references: [clothingItem.id],
	}),
}));

// Styling Rule relations
export const stylingRuleRelations = relations(stylingRule, ({ one }) => ({
	createdBy: one(user, {
		fields: [stylingRule.createdByUserId],
		references: [user.id],
	}),
}));
