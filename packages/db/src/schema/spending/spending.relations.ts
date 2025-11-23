import { relations } from "drizzle-orm";
import { agentsTable } from "../agents/agents.db";
import { user } from "../auth/auth.db";
import { spendingAuthorizationsTable } from "./spending.db";

export const spendingAuthorizationsRelations = relations(
	spendingAuthorizationsTable,
	({ one }) => ({
		user: one(user, {
			fields: [spendingAuthorizationsTable.userId],
			references: [user.id],
		}),
		agent: one(agentsTable, {
			fields: [spendingAuthorizationsTable.agentId],
			references: [agentsTable.id],
		}),
	})
);
