import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const purchasesTable = pgTable("purchases", {
	id: text("id").primaryKey(),
	itemId: text("item_id").notNull(),
	txHash: text("tx_hash").notNull().unique(),
	userWalletAddress: text("user_wallet_address").notNull(),
	agentWalletAddress: text("agent_wallet_address").notNull(),
	amount: integer("amount").notNull(),
	network: text("network").notNull(),
	paymentProof: jsonb("payment_proof"),
	ap2Intent: jsonb("ap2_intent").notNull(),
	itemSnapshot: jsonb("item_snapshot").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
