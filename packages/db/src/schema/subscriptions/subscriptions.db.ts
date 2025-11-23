import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { agentsTable } from "../agents/agents.db";
import { user } from "../auth/auth.db";
import { typeId } from "../../utils/db-utils";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import type { SubscriptionId, SubscriptionPaymentId } from "@ai-stilist/shared/typeid";

export const subscriptionsTable = pgTable("subscriptions", {
	id: typeId("subscription", "id")
		.$defaultFn(() => typeIdGenerator("subscription"))
		.primaryKey()
		.$type<SubscriptionId>(),
	userId: typeId("user", "user_id")
		.notNull()
		.references(() => user.id),
	agentId: typeId("agent", "agent_id")
		.notNull()
		.references(() => agentsTable.id),

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
		.references(() => subscriptionsTable.id),

	amount: integer("amount").notNull(),
	paymentMethod: text("payment_method").notNull(),
	txHash: text("tx_hash"),
	status: text("status").notNull().default("completed"),

	paidAt: timestamp("paid_at").notNull().defaultNow(),
});
