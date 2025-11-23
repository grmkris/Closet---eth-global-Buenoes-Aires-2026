import type {
	AgentId,
	SubscriptionId,
	SubscriptionPaymentId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { typeId } from "../../utils/db-utils";
import { agentsTable } from "../agents/agents.db";
import { user } from "../auth/auth.db";

export const subscriptionsTable = pgTable("subscriptions", {
	id: typeId("subscription", "id")
		.$defaultFn(() => typeIdGenerator("subscription"))
		.primaryKey()
		.$type<SubscriptionId>(),
	userId: typeId("user", "user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.$type<UserId>(),
	agentId: typeId("agent", "agent_id")
		.notNull()
		.references(() => agentsTable.id, { onDelete: "cascade" })
		.$type<AgentId>(),

	priceMonthly: integer("price_monthly").notNull(),
	status: text("status").notNull().default("active"),

	lastPaymentAt: timestamp("last_payment_at"),
	nextPaymentDue: timestamp("next_payment_due"),

	startedAt: timestamp("started_at").notNull().defaultNow(),
	cancelledAt: timestamp("cancelled_at"),
});

export const subscriptionPaymentsTable = pgTable("subscription_payments", {
	id: typeId("subscriptionPayment", "id")
		.primaryKey()
		.$defaultFn(() => typeIdGenerator("subscriptionPayment"))
		.$type<SubscriptionPaymentId>(),
	subscriptionId: typeId("subscription", "subscription_id")
		.notNull()
		.references(() => subscriptionsTable.id, { onDelete: "cascade" })
		.$type<SubscriptionId>(),

	amount: integer("amount").notNull(),
	paymentMethod: text("payment_method").notNull(),
	txHash: text("tx_hash"),
	status: text("status").notNull().default("completed"),

	// x402 payment tracking
	network: text("network"), // "polygon" | "polygon-amoy" | "base" | "base-sepolia"
	paymentProof: jsonb("payment_proof"), // Full PaymentProof object from x402
	verifiedAt: timestamp("verified_at"), // When payment was verified on-chain

	paidAt: timestamp("paid_at").notNull().defaultNow(),
});
