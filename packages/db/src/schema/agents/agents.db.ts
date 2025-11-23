import type { AgentId, UserId } from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";

export const agentsTable = pgTable("agents", {
	id: typeId("agent", "id")
		.primaryKey()
		.$defaultFn(() => typeIdGenerator("agent"))
		.$type<AgentId>(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	specialty: text("specialty").notNull(),

	// CDP Wallet - just store address
	walletAddress: text("wallet_address").notNull().unique(),

	// ERC-8004
	erc8004TokenId: text("erc8004_token_id"),
	metadataUri: text("metadata_uri"),
	reputationScore: integer("reputation_score").default(500),

	priceMonthly: integer("price_monthly").notNull(), // cents
	creatorUserId: typeId("user", "creator_user_id")
		.references(() => user.id)
		.$type<UserId>(), // nullable for system agents

	verified: boolean("verified").default(false),
	active: boolean("active").default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
