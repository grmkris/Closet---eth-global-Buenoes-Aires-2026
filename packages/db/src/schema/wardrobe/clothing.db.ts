import {
	type ClothingEmbeddingId,
	type ClothingItemId,
	type ClothingMetadataId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import {
	index,
	jsonb,
	pgTable,
	real,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import {
	baseEntityFields,
	createTimestampField,
	typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";

export const clothingItemStatusEnum = [
	"pending",
	"processing",
	"ready",
	"failed",
] as const;
export type ClothingItemStatus = (typeof clothingItemStatusEnum)[number];

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
		imageUrl: text("image_url"),
		status: text("status", { enum: clothingItemStatusEnum })
			.notNull()
			.default("pending"),
		processingJobId: text("processing_job_id"),
		...baseEntityFields,
	},
	(table) => ({
		userIdIdx: index("clothing_item_user_id_idx").on(table.userId),
		statusIdx: index("clothing_item_status_idx").on(table.status),
		userIdStatusIdx: index("clothing_item_user_id_status_idx").on(
			table.userId,
			table.status
		),
	})
);

export const clothingCategoryEnum = [
	"top",
	"bottom",
	"shoes",
	"outerwear",
	"accessory",
] as const;
export type ClothingCategory = (typeof clothingCategoryEnum)[number];

export const clothingFormalityEnum = [
	"casual",
	"smart-casual",
	"business",
	"formal",
] as const;
export type ClothingFormality = (typeof clothingFormalityEnum)[number];

export const clothingFitEnum = [
	"slim",
	"regular",
	"loose",
	"oversized",
] as const;
export type ClothingFit = (typeof clothingFitEnum)[number];

export const clothingSeasonEnum = [
	"spring",
	"summer",
	"fall",
	"winter",
] as const;
export type ClothingSeason = (typeof clothingSeasonEnum)[number];

export const clothingMetadata = pgTable(
	"clothing_metadata",
	{
		id: typeId("clothingMetadata", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("clothingMetadata"))
			.$type<ClothingMetadataId>(),
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.unique()
			.references(() => clothingItem.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		category: text("category", { enum: clothingCategoryEnum }).notNull(),
		subcategory: text("subcategory").notNull(),
		colors: jsonb("colors").$type<string[]>().notNull(),
		primaryColor: text("primary_color").notNull(),
		patterns: jsonb("patterns").$type<string[]>().notNull(),
		formality: text("formality", { enum: clothingFormalityEnum }).notNull(),
		seasons: jsonb("seasons").$type<ClothingSeason[]>().notNull(),
		occasions: jsonb("occasions").$type<string[]>().notNull(),
		fit: text("fit", { enum: clothingFitEnum }).notNull(),
		brand: text("brand"),
		material: text("material"),
		styleTags: jsonb("style_tags").$type<string[]>().notNull(),
		userNotes: text("user_notes"),
		aiConfidence: real("ai_confidence").notNull(),
		...baseEntityFields,
	},
	(table) => ({
		itemIdIdx: index("clothing_metadata_item_id_idx").on(table.itemId),
		categoryIdx: index("clothing_metadata_category_idx").on(table.category),
	})
);

export const clothingEmbedding = pgTable(
	"clothing_embedding",
	{
		id: typeId("clothingEmbedding", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("clothingEmbedding"))
			.$type<ClothingEmbeddingId>(),
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.unique()
			.references(() => clothingItem.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		embedding: jsonb("embedding").$type<number[]>().notNull(),
		modelVersion: varchar("model_version", { length: 50 }).notNull(),
		createdAt: createTimestampField("created_at").$defaultFn(() => new Date()),
	},
	(table) => ({
		itemIdIdx: index("clothing_embedding_item_id_idx").on(table.itemId),
	})
);
