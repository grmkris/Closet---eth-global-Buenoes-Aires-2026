import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import {
	subscriptionPaymentsTable,
	subscriptionsTable,
} from "./subscriptions.db";

export const subscriptionsRelations = relations(
	subscriptionsTable,
	({ one, many }) => ({
		user: one(user, {
			fields: [subscriptionsTable.userId],
			references: [user.id],
		}),
		payments: many(subscriptionPaymentsTable),
	})
);

export const subscriptionPaymentsRelations = relations(
	subscriptionPaymentsTable,
	({ one }) => ({
		subscription: one(subscriptionsTable, {
			fields: [subscriptionPaymentsTable.subscriptionId],
			references: [subscriptionsTable.id],
		}),
	})
);
