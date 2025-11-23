import { and, eq } from "@ai-stilist/db/drizzle";
import { agentsTable } from "@ai-stilist/db/schema/agents";
import {
	subscriptionPaymentsTable,
	subscriptionsTable,
} from "@ai-stilist/db/schema/subscriptions";
import { z } from "zod";
import { protectedProcedure, router } from "../context";

export const subscriptionRouter = router({
	// Returns payment requirements (x402-style)
	initiate: protectedProcedure
		.input(z.object({ agentId: z.string().uuid() }))
		.mutation(async ({ input, ctx }) => {
			const agent = await ctx.db.query.agentsTable.findFirst({
				where: eq(agentsTable.id, input.agentId),
			});

			if (!agent) {
				throw new Error("Agent not found");
			}

			return {
				agentId: agent.id,
				amount: agent.priceMonthly / 100,
				currency: "USD",
				recipient: agent.walletAddress,
				paymentMethods: [
					{ type: "crypto", network: "base", asset: "USDC" },
					{ type: "card", provider: "coinbase" },
				],
			};
		}),

	confirm: protectedProcedure
		.input(
			z.object({
				agentId: z.string().uuid(),
				paymentProof: z.object({
					txHash: z.string().optional(),
					paymentId: z.string(),
					method: z.enum(["crypto", "card"]),
					amount: z.number(),
				}),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const agent = await ctx.db.query.agentsTable.findFirst({
				where: eq(agentsTable.id, input.agentId),
			});

			if (!agent) {
				throw new Error("Agent not found");
			}

			// TODO: Verify payment via CDP

			const [subscription] = await ctx.db
				.insert(subscriptionsTable)
				.values({
					userId: ctx.session.user.id,
					agentId: input.agentId,
					priceMonthly: agent.priceMonthly,
					status: "active",
					lastPaymentAt: new Date(),
					nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				})
				.returning();

			await ctx.db.insert(subscriptionPaymentsTable).values({
				subscriptionId: subscription.id,
				amount: Math.round(input.paymentProof.amount * 100),
				paymentMethod: input.paymentProof.method,
				txHash: input.paymentProof.txHash,
				status: "completed",
			});

			return subscription;
		}),

	list: protectedProcedure.query(
		async ({ ctx }) =>
			await ctx.db.query.subscriptionsTable.findMany({
				where: eq(subscriptionsTable.userId, ctx.session.user.id),
				with: { agent: true },
			})
	),

	cancel: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input, ctx }) => {
			const [cancelled] = await ctx.db
				.update(subscriptionsTable)
				.set({ status: "cancelled", cancelledAt: new Date() })
				.where(
					and(
						eq(subscriptionsTable.id, input.id),
						eq(subscriptionsTable.userId, ctx.session.user.id)
					)
				)
				.returning();

			return cancelled;
		}),
});
