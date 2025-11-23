import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import { agentsTable } from "./agents.db";

export const agentsRelations = relations(agentsTable, ({ one }) => ({
	creator: one(user, {
		fields: [agentsTable.creatorUserId],
		references: [user.id],
	}),
}));
