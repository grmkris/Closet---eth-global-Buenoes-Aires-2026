import {
	type ClothingItemId,
	type OutfitId,
	type OutfitItemId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { baseEntityFields, typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";
import { clothingItem } from "./clothing.db";

export const outfit = pgTable(
	"outfit",
	{
		id: typeId("outfit", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("outfit"))
			.$type<OutfitId>(),
		userId: typeId("user", "user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.$type<UserId>(),
		name: text("name"),
		occasion: text("occasion"),
		season: text("season"),
		aiGenerated: boolean("ai_generated").notNull().default(false),
		generationPrompt: text("generation_prompt"),
		...baseEntityFields,
	},
	(table) => ({
		userIdIdx: index("outfit_user_id_idx").on(table.userId),
		occasionIdx: index("outfit_occasion_idx").on(table.occasion),
	})
);

export const outfitItemSlotEnum = [
	"top",
	"bottom",
	"shoes",
	"outerwear",
	"accessory",
] as const;
export type OutfitItemSlot = (typeof outfitItemSlotEnum)[number];

export const outfitItem = pgTable(
	"outfit_item",
	{
		id: typeId("outfitItem", "id")
			.primaryKey()
			.$defaultFn(() => typeIdGenerator("outfitItem"))
			.$type<OutfitItemId>(),
		outfitId: typeId("outfit", "outfit_id")
			.notNull()
			.references(() => outfit.id, { onDelete: "cascade" })
			.$type<OutfitId>(),
		itemId: typeId("clothingItem", "item_id")
			.notNull()
			.references(() => clothingItem.id, { onDelete: "cascade" })
			.$type<ClothingItemId>(),
		slot: text("slot", { enum: outfitItemSlotEnum }).notNull(),
		order: integer("order").notNull().default(0),
	},
	(table) => ({
		outfitIdIdx: index("outfit_item_outfit_id_idx").on(table.outfitId),
		itemIdIdx: index("outfit_item_item_id_idx").on(table.itemId),
	})
);
