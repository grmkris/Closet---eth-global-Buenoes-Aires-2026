import { FIELD_LIMITS } from "@ai-stilist/shared/constants";
import type {
	CategoryId,
	ClothingAnalysisId,
	ClothingItemId,
	ColorId,
	TagId,
	TagTypeId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	ClothingItemStatus,
	categoriesTable,
	clothingAnalysesTable,
	clothingItemsTable,
	colorsTable,
	TagSource,
	tagsTable,
	tagTypesTable,
} from "./wardrobe.db";

// Clothing Item Schemas
export const SelectClothingItemSchema = createSelectSchema(clothingItemsTable, {
	id: z.string() as unknown as typeof ClothingItemId,
	userId: z.string() as unknown as typeof UserId,
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
	status: ClothingItemStatus,
});

export const InsertClothingItemSchema = z.object({
	userId: z.string() as unknown as typeof UserId,
	imageKey: z.string().min(FIELD_LIMITS.minLength),
	status: ClothingItemStatus.optional(),
});

export type SelectClothingItemSchema = z.infer<typeof SelectClothingItemSchema>;
export type InsertClothingItemSchema = z.infer<typeof InsertClothingItemSchema>;

// Clothing Analysis Schemas
export const SelectClothingAnalysisSchema = createSelectSchema(
	clothingAnalysesTable,
	{
		id: z.string() as unknown as typeof ClothingAnalysisId,
		itemId: z.string() as unknown as typeof ClothingItemId,
		updatedAt: z.coerce.date(),
		createdAt: z.coerce.date(),
	}
);

export const InsertClothingAnalysisSchema = z.object({
	itemId: z.string() as unknown as typeof ClothingItemId,
	modelVersion: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeModelVersion),
});

export type SelectClothingAnalysisSchema = z.infer<
	typeof SelectClothingAnalysisSchema
>;
export type InsertClothingAnalysisSchema = z.infer<
	typeof InsertClothingAnalysisSchema
>;

// Category Schemas
export const SelectCategorySchema = createSelectSchema(categoriesTable, {
	id: z.string() as unknown as typeof CategoryId,
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
});

export const InsertCategorySchema = z.object({
	name: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeItemName),
	displayName: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeDisplayName),
});

export type SelectCategorySchema = z.infer<typeof SelectCategorySchema>;
export type InsertCategorySchema = z.infer<typeof InsertCategorySchema>;

// Color Schemas
export const SelectColorSchema = createSelectSchema(colorsTable, {
	id: z.string() as unknown as typeof ColorId,
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
});

export const InsertColorSchema = z.object({
	name: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeItemName),
	hexCode: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code (#RRGGBB)")
		.optional(),
});

export type SelectColorSchema = z.infer<typeof SelectColorSchema>;
export type InsertColorSchema = z.infer<typeof InsertColorSchema>;

// Tag Type Schemas
export const SelectTagTypeSchema = createSelectSchema(tagTypesTable, {
	id: z.string() as unknown as typeof TagTypeId,
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
});

export const InsertTagTypeSchema = z.object({
	name: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeItemName),
	displayName: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeDisplayName),
});

export type SelectTagTypeSchema = z.infer<typeof SelectTagTypeSchema>;
export type InsertTagTypeSchema = z.infer<typeof InsertTagTypeSchema>;

// Tag Schemas
export const SelectTagSchema = createSelectSchema(tagsTable, {
	id: z.string() as unknown as typeof TagId,
	typeId: z.string() as unknown as typeof TagTypeId,
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
});

export const InsertTagSchema = z.object({
	typeId: z.string() as unknown as typeof TagTypeId,
	name: z
		.string()
		.min(FIELD_LIMITS.minLength)
		.max(FIELD_LIMITS.wardrobeItemName),
	usageCount: z.number().int().min(0).optional(),
});

export type SelectTagSchema = z.infer<typeof SelectTagSchema>;
export type InsertTagSchema = z.infer<typeof InsertTagSchema>;

// Junction Table Schemas
export const InsertClothingItemCategorySchema = z.object({
	itemId: z.string() as unknown as typeof ClothingItemId,
	categoryId: z.string() as unknown as typeof CategoryId,
});

export const InsertClothingItemColorSchema = z.object({
	itemId: z.string() as unknown as typeof ClothingItemId,
	colorId: z.string() as unknown as typeof ColorId,
	order: z.number().int().min(0).optional(),
});

export const InsertClothingItemTagSchema = z.object({
	itemId: z.string() as unknown as typeof ClothingItemId,
	tagId: z.string() as unknown as typeof TagId,
	source: TagSource.optional(),
});

export type InsertClothingItemCategorySchema = z.infer<
	typeof InsertClothingItemCategorySchema
>;
export type InsertClothingItemColorSchema = z.infer<
	typeof InsertClothingItemColorSchema
>;
export type InsertClothingItemTagSchema = z.infer<
	typeof InsertClothingItemTagSchema
>;
