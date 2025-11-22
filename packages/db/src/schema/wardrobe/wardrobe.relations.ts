import { relations } from "drizzle-orm";
import { clothingAnalysis, clothingItem } from "./clothing.db";

// Define relationship between clothing items and their analyses
export const clothingItemRelations = relations(clothingItem, ({ one }) => ({
	analysis: one(clothingAnalysis, {
		fields: [clothingItem.id],
		references: [clothingAnalysis.itemId],
	}),
}));

export const clothingAnalysisRelations = relations(
	clothingAnalysis,
	({ one }) => ({
		item: one(clothingItem, {
			fields: [clothingAnalysis.itemId],
			references: [clothingItem.id],
		}),
	})
);
