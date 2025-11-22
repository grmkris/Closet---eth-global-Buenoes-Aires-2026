import {
	type ClothingAnalysisId,
	type ClothingItemId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import { index, jsonb, pgTable, real, text } from "drizzle-orm/pg-core";
import { baseEntityFields, typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";

// Only enum we keep - for tracking processing status
export const clothingItemStatusEnum = [
	"pending",
	"processing",
	"ready",
	"failed",
] as const;
export type ClothingItemStatus = (typeof clothingItemStatusEnum)[number];

// Minimal clothing item table - just tracks the image
export const clothingItem = pgTable(
	"clothing_item",
	{
		id: typeId("clothingItem", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("clothingItem"))
			.$type<ClothingItemId>(),
		userId: typeId("user", "user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.$type<UserId>(),
		imageKey: text("image_key").notNull(),
		status: text("status", { enum: clothingItemStatusEnum })
			.notNull()
			.default("pending"),
		...baseEntityFields,
	},
	(table) => [
		index("clothing_item_user_id_idx").on(table.userId),
		index("clothing_item_status_idx").on(table.status),
		index("clothing_item_user_id_status_idx").on(table.userId, table.status),
	]
);

// Flexible AI analysis table - no rigid enums, just dynamic tags
export const clothingAnalysis = pgTable(
	"clothing_analysis",
	{
		id: typeId("clothingAnalysis", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("clothingAnalysis"))
			.$type<ClothingAnalysisId>(),
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.unique()
			.references(() => clothingItem.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),

		// Core AI-extracted data (flexible, no enums)
		category: text("category").notNull(), // "top", "dress", "shoes" etc - AI decides
		colors: jsonb("colors").$type<string[]>().notNull(), // ["navy", "white", "#FF5733"]
		tags: jsonb("tags").$type<string[]>().notNull(), // All tags: style, occasion, material, brand, etc

		// AI metadata
		confidence: real("confidence").notNull(), // 0-1 confidence score
		modelVersion: text("model_version").notNull(), // Track which AI model version for future reprocessing

		...baseEntityFields,
	},
	(table) => [
		index("clothing_analysis_item_id_idx").on(table.itemId),
		index("clothing_analysis_category_idx").on(table.category),
	]
);
