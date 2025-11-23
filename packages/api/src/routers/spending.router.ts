import { and, eq } from "@ai-stilist/db/drizzle";
import { walletAddress } from "@ai-stilist/db/schema/auth";
import { spendingAuthorizationsTable } from "@ai-stilist/db/schema/spending";
import {
	AgentId,
	SpendingAuthorizationId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { verifyMessage } from "viem";
import { z } from "zod";
import { protectedProcedure } from "../index";

// Input schemas
const CreateAuthorizationInput = z.object({
	agentId: AgentId,
	monthlyBudget: z.number().positive(),
	maxPerTransaction: z.number().positive(),
	allowedCategories: z.array(z.string()),
	validUntil: z.string().datetime(),
	ap2Intent: z.record(z.string(), z.any()),
	signature: z.string(),
});

const GetAuthorizationInput = z.object({
	agentId: AgentId,
});

const VerifySpendingInput = z.object({
	authorizationId: SpendingAuthorizationId,
	amount: z.number().positive(),
	category: z.string(),
});

const RecordSpendingInput = z.object({
	authorizationId: SpendingAuthorizationId,
	amount: z.number().positive(),
});

const RevokeAuthorizationInput = z.object({
	authorizationId: SpendingAuthorizationId,
});

export const spendingRouter = {
	/**
	 * Create spending authorization with AP2 intent signature
	 */
	createAuthorization: protectedProcedure
		.input(CreateAuthorizationInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Get user's wallet
			const userWallet = await context.db.query.walletAddress.findFirst({
				where: eq(walletAddress.userId, userId),
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

			// Create authorization
			const [auth] = await context.db
				.insert(spendingAuthorizationsTable)
				.values({
					userId,
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

			if (!auth) {
				throw new Error("Failed to create spending authorization");
			}

			context.logger.info({
				msg: "Spending authorization created",
				authorizationId: auth.id,
				userId,
				agentId: input.agentId,
				monthlyBudget: input.monthlyBudget,
			});

			return {
				id: auth.id,
				agentId: auth.agentId,
				monthlyBudget: auth.monthlyBudget / 100,
				maxPerTransaction: auth.maxPerTransaction / 100,
				validUntil: auth.validUntil,
				active: auth.active,
			};
		}),

	/**
	 * Get active spending authorization for an agent
	 */
	getAuthorization: protectedProcedure
		.input(GetAuthorizationInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			const authorization =
				await context.db.query.spendingAuthorizationsTable.findFirst({
					where: and(
						eq(spendingAuthorizationsTable.userId, userId),
						eq(spendingAuthorizationsTable.agentId, input.agentId),
						eq(spendingAuthorizationsTable.active, true)
					),
				});

			if (!authorization) {
				throw new Error("Authorization not found");
			}

			return authorization;
		}),

	/**
	 * List all spending authorizations for current user
	 */
	listAuthorizations: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		const authorizations =
			await context.db.query.spendingAuthorizationsTable.findMany({
				where: eq(spendingAuthorizationsTable.userId, userId),
				orderBy: (auths, { desc: descFn }) => [descFn(auths.createdAt)],
			});

		return {
			authorizations,
			total: authorizations.length,
		};
	}),

	/**
	 * Verify if a spending amount is allowed under authorization
	 */
	verifySpending: protectedProcedure
		.input(VerifySpendingInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			const auth = await context.db.query.spendingAuthorizationsTable.findFirst(
				{
					where: and(
						eq(spendingAuthorizationsTable.id, input.authorizationId),
						eq(spendingAuthorizationsTable.userId, userId)
					),
				}
			);

			if (!auth) {
				return { allowed: false, reason: "Authorization not found" };
			}

			const amountCents = Math.round(input.amount * 100);

			if (!auth.active) {
				return { allowed: false, reason: "Authorization inactive" };
			}

			if (new Date() > auth.validUntil) {
				return { allowed: false, reason: "Authorization expired" };
			}

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

	/**
	 * Record spending against authorization
	 */
	recordSpending: protectedProcedure
		.input(RecordSpendingInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			const auth = await context.db.query.spendingAuthorizationsTable.findFirst(
				{
					where: and(
						eq(spendingAuthorizationsTable.id, input.authorizationId),
						eq(spendingAuthorizationsTable.userId, userId)
					),
				}
			);

			if (!auth) {
				throw new Error("Authorization not found");
			}

			if (!auth.active) {
				throw new Error("Authorization is not active");
			}

			const amountCents = Math.round(input.amount * 100);

			await context.db
				.update(spendingAuthorizationsTable)
				.set({ currentPeriodSpent: auth.currentPeriodSpent + amountCents })
				.where(eq(spendingAuthorizationsTable.id, input.authorizationId));

			context.logger.info({
				msg: "Spending recorded",
				authorizationId: input.authorizationId,
				userId,
				amount: input.amount,
				newTotal: (auth.currentPeriodSpent + amountCents) / 100,
			});

			return {
				success: true,
				currentPeriodSpent: (auth.currentPeriodSpent + amountCents) / 100,
			};
		}),

	/**
	 * Revoke spending authorization
	 */
	revokeAuthorization: protectedProcedure
		.input(RevokeAuthorizationInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Verify authorization belongs to user
			const auth = await context.db.query.spendingAuthorizationsTable.findFirst(
				{
					where: and(
						eq(spendingAuthorizationsTable.id, input.authorizationId),
						eq(spendingAuthorizationsTable.userId, userId)
					),
				}
			);

			if (!auth) {
				throw new Error("Authorization not found");
			}

			await context.db
				.update(spendingAuthorizationsTable)
				.set({ active: false })
				.where(eq(spendingAuthorizationsTable.id, input.authorizationId));

			context.logger.info({
				msg: "Spending authorization revoked",
				authorizationId: input.authorizationId,
				userId,
			});

			return {
				success: true,
			};
		}),
};
