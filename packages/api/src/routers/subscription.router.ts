import { and, eq } from "@ai-stilist/db/drizzle";
import { agentsTable } from "@ai-stilist/db/schema/agents";
import {
	subscriptionPaymentsTable,
	subscriptionsTable,
} from "@ai-stilist/db/schema/subscriptions";
import { CHAIN_IDS, USDC_ADDRESSES } from "@ai-stilist/shared/constants";
import { SubscriptionId, UserId } from "@ai-stilist/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../index";

const CancelSubscriptionInput = z.object({
	id: SubscriptionId,
});

const CompleteSubscriptionInput = z.object({
	signature: z.string(),
	authorization: z.object({
		from: z.string(),
		to: z.string(),
		value: z.string(),
		validAfter: z.number(),
		validBefore: z.number(),
		nonce: z.number(),
	}),
});

export type PaymentRequirements = {
	price: string;
	recipient: string;
	network: string;
	chainId: number;
	usdcAddress: string;
};

export const subscriptionRouter = {
	/**
	 * Initiate subscription - get payment requirements for the default agent
	 */
	initiate: protectedProcedure.handler(async ({ context }) => {
		// Get the default agent (first active agent in the database)
		const agent = await context.db.query.agentsTable.findFirst({
			where: eq(agentsTable.active, true),
			orderBy: (a, { asc }) => [asc(a.createdAt)],
		});

		if (!agent) {
			throw new Error("No active agent found");
		}

		// Use testnet for now (TODO: make this configurable based on environment)
		const chainId = CHAIN_IDS.POLYGON_AMOY_TESTNET;
		const usdcAddress = USDC_ADDRESSES[chainId];

		// Convert price from cents to dollars
		const priceInDollars = (agent.priceMonthly / 100).toFixed(2);

		if (!agent.walletAddress) {
			throw new Error("Agent wallet address not found");
		}

		const requirements: PaymentRequirements = {
			price: `$${priceInDollars}`,
			recipient: agent.walletAddress,
			network: "polygon-amoy",
			chainId,
			usdcAddress,
		};

		return requirements;
	}),

	/**
	 * Complete subscription - create subscription after user signs payment authorization
	 */
	complete: protectedProcedure
		.input(CompleteSubscriptionInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Get the default agent
			const agent = await context.db.query.agentsTable.findFirst({
				where: eq(agentsTable.active, true),
				orderBy: (a, { asc }) => [asc(a.createdAt)],
			});

			if (!agent) {
				throw new Error("No active agent found");
			}

			// Check if user already has active subscription
			const existingSub = await context.db.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.userId, userId),
					eq(subscriptionsTable.agentId, agent.id),
					eq(subscriptionsTable.status, "active")
				),
			});

			if (existingSub) {
				throw new Error(
					"You already have an active subscription to this agent"
				);
			}

			// Calculate next payment date (30 days from now)
			const now = new Date();
			const nextPaymentDue = new Date(now);
			nextPaymentDue.setDate(nextPaymentDue.getDate() + 30);

			// Create subscription
			const [subscription] = await context.db
				.insert(subscriptionsTable)
				.values({
					userId,
					agentId: agent.id,
					priceMonthly: agent.priceMonthly,
					status: "active",
					lastPaymentAt: now,
					nextPaymentDue,
					startedAt: now,
				})
				.returning();

			if (!subscription) {
				throw new Error("Failed to create subscription");
			}

			// Create payment record
			const [payment] = await context.db
				.insert(subscriptionPaymentsTable)
				.values({
					subscriptionId: subscription.id,
					amount: agent.priceMonthly,
					paymentMethod: "eip3009",
					status: "completed",
					network: "polygon-amoy",
					paymentProof: {
						signature: input.signature,
						authorization: input.authorization,
					},
					verifiedAt: now,
					paidAt: now,
				})
				.returning();

			context.logger.info({
				msg: "Subscription created",
				subscriptionId: subscription.id,
				userId,
				agentId: agent.id,
				paymentId: payment?.id,
			});

			return {
				subscription,
				payment,
			};
		}),

	/**
	 * List all subscriptions for current user
	 */
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = UserId.parse(context.session.user.id);

		const subscriptions = await context.db.query.subscriptionsTable.findMany({
			where: eq(subscriptionsTable.userId, userId),
			orderBy: (subs, { desc: descFn }) => [descFn(subs.startedAt)],
			with: {
				agent: true,
			},
		});

		return {
			subscriptions,
			total: subscriptions.length,
		};
	}),

	/**
	 * Get single subscription by ID
	 */
	get: protectedProcedure
		.input(z.object({ id: SubscriptionId }))
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			const subscription = await context.db.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.id, input.id),
					eq(subscriptionsTable.userId, userId)
				),
				with: {
					agent: true,
				},
			});

			if (!subscription) {
				throw new Error("Subscription not found");
			}

			return subscription;
		}),

	/**
	 * Cancel subscription
	 */
	cancel: protectedProcedure
		.input(CancelSubscriptionInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Verify subscription exists and belongs to user
			const subscription = await context.db.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.id, input.id),
					eq(subscriptionsTable.userId, userId)
				),
			});

			if (!subscription) {
				throw new Error("Subscription not found");
			}

			if (subscription.status === "cancelled") {
				throw new Error("Subscription is already cancelled");
			}

			const [cancelled] = await context.db
				.update(subscriptionsTable)
				.set({ status: "cancelled", cancelledAt: new Date() })
				.where(eq(subscriptionsTable.id, input.id))
				.returning();

			context.logger.info({
				msg: "Subscription cancelled",
				subscriptionId: input.id,
				userId,
				agentId: subscription.agentId,
			});

			if (!cancelled) {
				throw new Error("Failed to cancel subscription");
			}

			return {
				id: cancelled.id,
				status: cancelled.status,
				cancelledAt: cancelled.cancelledAt,
			};
		}),
};
