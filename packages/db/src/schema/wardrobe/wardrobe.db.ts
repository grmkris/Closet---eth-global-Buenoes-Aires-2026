import {
	type CategoryId,
	type ClothingAnalysisId,
	type ClothingItemId,
	type ColorId,
	type TagId,
	type TagTypeId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import z from "zod";
import { baseEntityFields, typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";

// Only enum we keep - for tracking processing status
export const CLOTHING_ITEM_STATUSES = [
	"awaiting_upload",
	"queued",
	"processing_image",
	"analyzing",
	"completed",
	"failed",
] as const;
export const ClothingItemStatus = z.enum(CLOTHING_ITEM_STATUSES);
export type ClothingItemStatus = z.infer<typeof ClothingItemStatus>;
export const ClothingItemStatusPgEnum = pgEnum(
	"clothing_item_status",
	CLOTHING_ITEM_STATUSES
);

// Minimal clothing item table - just tracks the image
export const clothingItemsTable = pgTable(
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
		processedImageKey: text("processed_image_key"), // Converted WebP image key
		thumbnailKey: text("thumbnail_key"), // Thumbnail image key
		status: ClothingItemStatusPgEnum("status")
			.notNull()
			.default("awaiting_upload"),
		errorDetails: text("error_details"), // Technical error details (JSON) for debugging
		attemptCount: integer("attempt_count").notNull().default(0), // Track retry attempts
		lastAttemptAt: timestamp("last_attempt_at"), // Track when last processing attempt was made
		...baseEntityFields,
	},
	(table) => [
		index("clothing_item_user_id_idx").on(table.userId),
		index("clothing_item_status_idx").on(table.status),
		index("clothing_item_user_id_status_idx").on(table.userId, table.status),
	]
);

// Flexible AI analysis table - no rigid enums, just dynamic tags
export const clothingAnalysesTable = pgTable(
	"clothing_analysis",
	{
		id: typeId("clothingAnalysis", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("clothingAnalysis"))
			.$type<ClothingAnalysisId>(),
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.unique()
			.references(() => clothingItemsTable.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),

		// AI metadata
		modelVersion: text("model_version").notNull(), // Track which AI model version for future reprocessing // TODO maybe make this enum?

		...baseEntityFields,
	},
	(table) => [index("clothing_analysis_item_id_idx").on(table.itemId)]
);

// Category lookup table
export const categoriesTable = pgTable(
	"category",
	{
		id: typeId("category", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("category"))
			.$type<CategoryId>(),
		name: text("name").notNull().unique(), // "top", "bottom", "dress", etc.
		displayName: text("display_name").notNull(), // "Top", "Bottom", "Dress"
		...baseEntityFields,
	},
	(table) => [index("category_name_idx").on(table.name)]
);

// Color lookup table
export const colorsTable = pgTable(
	"color",
	{
		id: typeId("color", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("color"))
			.$type<ColorId>(),
		name: text("name").notNull().unique(), // "navy", "white" (lowercased)
		hexCode: text("hex_code"), // "#000080", "#FFFFFF" (optional)
		...baseEntityFields,
	},
	(table) => [index("color_name_idx").on(table.name)]
);

// Tag type lookup table
export const tagTypesTable = pgTable(
	"tag_type",
	{
		id: typeId("tagType", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("tagType"))
			.$type<TagTypeId>(),
		name: text("name").notNull().unique(), // "style", "season", "material", etc.
		displayName: text("display_name").notNull(), // "Style", "Season", "Material"
		...baseEntityFields,
	},
	(table) => [index("tag_type_name_idx").on(table.name)]
);

// Tag table with typing
export const tagsTable = pgTable(
	"tag",
	{
		id: typeId("tag", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("tag"))
			.$type<TagId>(),
		typeId: typeId("tagType", "type_id")
			.notNull()
			.references(() => tagTypesTable.id, { onDelete: "cascade" })
			.$type<TagTypeId>(),
		name: text("name").notNull(), // "casual", "summer", "cotton"
		usageCount: integer("usage_count").notNull().default(0), // Track popularity
		...baseEntityFields,
	},
	(table) => [
		index("tag_type_id_idx").on(table.typeId),
		index("tag_usage_count_idx").on(table.usageCount),
		unique("tag_type_id_name_unique").on(table.typeId, table.name),
	]
);

// Junction tables for many-to-many relationships

// Clothing item to category (many-to-many)
export const clothingItemCategoriesTable = pgTable(
	"clothing_item_category",
	{
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.references(() => clothingItemsTable.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		categoryId: typeId("category", "category_id")
			.notNull()
			.references(() => categoriesTable.id, { onDelete: "cascade" })
			.$type<CategoryId>(),
		...baseEntityFields,
	},
	(table) => [
		primaryKey({ columns: [table.itemId, table.categoryId] }),
		index("clothing_item_category_item_id_idx").on(table.itemId),
		index("clothing_item_category_category_id_idx").on(table.categoryId),
	]
);

// Clothing item to color (many-to-many)
export const clothingItemColorsTable = pgTable(
	"clothing_item_color",
	{
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.references(() => clothingItemsTable.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		colorId: typeId("color", "color_id")
			.notNull()
			.references(() => colorsTable.id, { onDelete: "cascade" })
			.$type<ColorId>(),
		order: integer("order").notNull().default(0), // Track color prominence (0 = most prominent)
		...baseEntityFields,
	},
	(table) => [
		primaryKey({ columns: [table.itemId, table.colorId] }),
		index("clothing_item_color_item_id_idx").on(table.itemId),
		index("clothing_item_color_color_id_idx").on(table.colorId),
	]
);

// Tag source enum
export const TAG_SOURCES = ["ai", "user"] as const;
export const TagSource = z.enum(TAG_SOURCES);
export type TagSource = z.infer<typeof TagSource>;
export const TagSourcePgEnum = pgEnum("tag_source", TAG_SOURCES);

// Clothing item to tag (many-to-many)
export const clothingItemTagsTable = pgTable(
	"clothing_item_tag",
	{
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.references(() => clothingItemsTable.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		tagId: typeId("tag", "tag_id")
			.notNull()
			.references(() => tagsTable.id, { onDelete: "cascade" })
			.$type<TagId>(),
		source: TagSourcePgEnum("source").notNull().default("ai"), // Track who added the tag
		...baseEntityFields,
	},
	(table) => [
		primaryKey({ columns: [table.itemId, table.tagId] }),
		index("clothing_item_tag_item_id_idx").on(table.itemId),
		index("clothing_item_tag_tag_id_idx").on(table.tagId),
		index("clothing_item_tag_source_idx").on(table.source),
	]
);
