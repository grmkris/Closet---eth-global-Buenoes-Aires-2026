import type {
	AgentId,
	SpendingAuthorizationId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { typeId } from "../../utils/db-utils";
import { agentsTable } from "../agents/agents.db";
import { user } from "../auth/auth.db";

export const spendingAuthorizationsTable = pgTable("spending_authorizations", {
	id: typeId("spendingAuthorization", "id")
		.primaryKey()
		.$defaultFn(() => typeIdGenerator("spendingAuthorization"))
		.$type<SpendingAuthorizationId>(),
	userId: typeId("user", "user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.$type<UserId>(),
	agentId: typeId("agent", "agent_id")
		.notNull()
		.references(() => agentsTable.id, { onDelete: "cascade" })
		.$type<AgentId>(),

	// AP2 Intent Mandate
	ap2IntentJson: jsonb("ap2_intent_json").notNull(),
	ap2Signature: text("ap2_signature").notNull(),

	monthlyBudget: integer("monthly_budget").notNull(),
	maxPerTransaction: integer("max_per_transaction").notNull(),
	allowedCategories: text("allowed_categories").array(),

	currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
	currentPeriodSpent: integer("current_period_spent").notNull().default(0),

	validFrom: timestamp("valid_from").notNull().defaultNow(),
	validUntil: timestamp("valid_until").notNull(),
	active: boolean("active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});
