import {
	type StylingRuleId,
	typeIdGenerator,
	type UserId,
} from "@ai-stilist/shared/typeid";
import { boolean, index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import {
	baseEntityFields,
	typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";

export const stylingRuleTypeEnum = [
	"color_matching",
	"formality",
	"season",
	"pattern_mix",
	"body_type",
	"general"
] as const;
export type StylingRuleType = typeof stylingRuleTypeEnum[number];

export const stylingRule = pgTable("styling_rule", {
	id: typeId("stylingRule", "id")
		.primaryKey()
		.$defaultFn(() => typeIdGenerator("stylingRule"))
		.$type<StylingRuleId>(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	ruleType: text("rule_type", { enum: stylingRuleTypeEnum }).notNull(),
	conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull(),
	recommendations: jsonb("recommendations").$type<Record<string, unknown>>().notNull(),
	priority: integer("priority").notNull().default(0),
	active: boolean("active").notNull().default(true),
	createdByUserId: typeId("user", "created_by_user_id")
		.references(() => user.id, { onDelete: "set null" })
		.$type<UserId>(),
	...baseEntityFields,
}, (table) => ({
	ruleTypeIdx: index("styling_rule_rule_type_idx").on(table.ruleType),
	activeIdx: index("styling_rule_active_idx").on(table.active),
	priorityIdx: index("styling_rule_priority_idx").on(table.priority),
}));
