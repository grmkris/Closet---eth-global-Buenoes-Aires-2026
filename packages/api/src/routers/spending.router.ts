import { and, eq } from "@ai-stilist/db/drizzle";
import { walletAddress } from "@ai-stilist/db/schema/auth";
import { spendingAuthorizationsTable } from "@ai-stilist/db/schema/spending";
import { verifyMessage } from "viem";
import { z } from "zod";
import { protectedProcedure, router } from "../context";

export const spendingRouter = router({
	createAuthorization: protectedProcedure
		.input(
			z.object({
				agentId: z.string().uuid(),
				monthlyBudget: z.number().positive(),
				maxPerTransaction: z.number().positive(),
				allowedCategories: z.array(z.string()),
				validUntil: z.string().datetime(),
				ap2Intent: z.record(z.any()),
				signature: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Get user's wallet
			const userWallet = await ctx.db.query.walletAddress.findFirst({
				where: eq(walletAddress.userId, ctx.session.user.id),
			});

			if (!userWallet) {
				throw new Error("No wallet connected");
			}

			// Verify AP2 signature
			const message = JSON.stringify(input.ap2Intent);
			const isValid = await verifyMessage({
				address: userWallet.address as `0x${string}`,
				message,
				signature: input.signature as `0x${string}`,
			});

			if (!isValid) {
				throw new Error("Invalid signature");
			}

			const [auth] = await ctx.db
				.insert(spendingAuthorizationsTable)
				.values({
					userId: ctx.session.user.id,
					agentId: input.agentId,
					ap2IntentJson: input.ap2Intent,
					ap2Signature: input.signature,
					monthlyBudget: Math.round(input.monthlyBudget * 100),
					maxPerTransaction: Math.round(input.maxPerTransaction * 100),
					allowedCategories: input.allowedCategories,
					validUntil: new Date(input.validUntil),
					active: true,
				})
				.returning();

			return auth;
		}),

	getAuthorization: protectedProcedure
		.input(z.object({ agentId: z.string().uuid() }))
		.query(
			async ({ input, ctx }) =>
				await ctx.db.query.spendingAuthorizationsTable.findFirst({
					where: and(
						eq(spendingAuthorizationsTable.userId, ctx.session.user.id),
						eq(spendingAuthorizationsTable.agentId, input.agentId),
						eq(spendingAuthorizationsTable.active, true)
					),
				})
		),

	verifySpending: protectedProcedure
		.input(
			z.object({
				authorizationId: z.string().uuid(),
				amount: z.number().positive(),
				category: z.string(),
			})
		)
		.query(async ({ input, ctx }) => {
			const auth = await ctx.db.query.spendingAuthorizationsTable.findFirst({
				where: eq(spendingAuthorizationsTable.id, input.authorizationId),
			});

			if (!auth) {
				return { allowed: false, reason: "Authorization not found" };
			}

			const amountCents = Math.round(input.amount * 100);

			if (!auth.active) return { allowed: false, reason: "Inactive" };
			if (new Date() > auth.validUntil)
				return { allowed: false, reason: "Expired" };
			if (amountCents > auth.maxPerTransaction) {
				return { allowed: false, reason: "Exceeds per-transaction limit" };
			}
			if (auth.currentPeriodSpent + amountCents > auth.monthlyBudget) {
				return { allowed: false, reason: "Exceeds monthly budget" };
			}
			if (!auth.allowedCategories?.includes(input.category)) {
				return { allowed: false, reason: "Category not allowed" };
			}

			return {
				allowed: true,
				remaining: (auth.monthlyBudget - auth.currentPeriodSpent) / 100,
			};
		}),

	recordSpending: protectedProcedure
		.input(
			z.object({
				authorizationId: z.string().uuid(),
				amount: z.number().positive(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const auth = await ctx.db.query.spendingAuthorizationsTable.findFirst({
				where: eq(spendingAuthorizationsTable.id, input.authorizationId),
			});

			if (!auth) {
				throw new Error("Authorization not found");
			}

			const amountCents = Math.round(input.amount * 100);

			await ctx.db
				.update(spendingAuthorizationsTable)
				.set({ currentPeriodSpent: auth.currentPeriodSpent + amountCents })
				.where(eq(spendingAuthorizationsTable.id, input.authorizationId));

			return { success: true };
		}),
});
