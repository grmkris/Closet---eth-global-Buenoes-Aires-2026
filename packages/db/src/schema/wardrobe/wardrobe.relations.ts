import { relations } from "drizzle-orm";
import {
	categoriesTable,
	clothingAnalysesTable,
	clothingItemCategoriesTable,
	clothingItemColorsTable,
	clothingItemsTable,
	clothingItemTagsTable,
	colorsTable,
	tagsTable,
	tagTypesTable,
} from "./wardrobe.db";

// Clothing item relations
export const clothingItemRelations = relations(
	clothingItemsTable,
	({ one, many }) => ({
		analysis: one(clothingAnalysesTable, {
			fields: [clothingItemsTable.id],
			references: [clothingAnalysesTable.itemId],
		}),
		categories: many(clothingItemCategoriesTable),
		colors: many(clothingItemColorsTable),
		tags: many(clothingItemTagsTable),
	})
);

export const clothingAnalysisRelations = relations(
	clothingAnalysesTable,
	({ one }) => ({
		item: one(clothingItemsTable, {
			fields: [clothingAnalysesTable.itemId],
			references: [clothingItemsTable.id],
		}),
	})
);

// Category relations
export const categoryRelations = relations(categoriesTable, ({ many }) => ({
	items: many(clothingItemCategoriesTable),
}));

// Color relations
export const colorRelations = relations(colorsTable, ({ many }) => ({
	items: many(clothingItemColorsTable),
}));

// Tag type relations
export const tagTypeRelations = relations(tagTypesTable, ({ many }) => ({
	tags: many(tagsTable),
}));

// Tag relations
export const tagRelations = relations(tagsTable, ({ one, many }) => ({
	type: one(tagTypesTable, {
		fields: [tagsTable.typeId],
		references: [tagTypesTable.id],
	}),
	items: many(clothingItemTagsTable),
}));

// Junction table relations

export const clothingItemCategoryRelations = relations(
	clothingItemCategoriesTable,
	({ one }) => ({
		item: one(clothingItemsTable, {
			fields: [clothingItemCategoriesTable.itemId],
			references: [clothingItemsTable.id],
		}),
		category: one(categoriesTable, {
			fields: [clothingItemCategoriesTable.categoryId],
			references: [categoriesTable.id],
		}),
	})
);

export const clothingItemColorRelations = relations(
	clothingItemColorsTable,
	({ one }) => ({
		item: one(clothingItemsTable, {
			fields: [clothingItemColorsTable.itemId],
			references: [clothingItemsTable.id],
		}),
		color: one(colorsTable, {
			fields: [clothingItemColorsTable.colorId],
			references: [colorsTable.id],
		}),
	})
);

export const clothingItemTagRelations = relations(
	clothingItemTagsTable,
	({ one }) => ({
		item: one(clothingItemsTable, {
			fields: [clothingItemTagsTable.itemId],
			references: [clothingItemsTable.id],
		}),
		tag: one(tagsTable, {
			fields: [clothingItemTagsTable.tagId],
			references: [tagsTable.id],
		}),
	})
);
