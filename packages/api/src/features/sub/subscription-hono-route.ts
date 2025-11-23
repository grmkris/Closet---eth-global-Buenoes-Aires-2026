import { and, eq } from "@ai-stilist/db/drizzle";
import { agentsTable } from "@ai-stilist/db/schema/agents";
import {
	subscriptionPaymentsTable,
	subscriptionsTable,
} from "@ai-stilist/db/schema/subscriptions";
import type { Environment } from "@ai-stilist/shared/services";
import { AgentId, UserId } from "@ai-stilist/shared/typeid";
import { auto } from "@swader/x402facilitators";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { paymentMiddleware } from "x402-hono";
import type { ContextDeps } from "../../context";

export const createSubscriptionHonoRoute = (deps: ContextDeps) => {
	const app = new Hono();

	// Get platform configuration
	const appEnv: Environment = deps.appEnv || "dev";
	const network = appEnv === "prod" ? "polygon" : "polygon-amoy";
	const platformWallet =
		process.env.DEFAULT_AGENT_WALLET_ADDRESS ||
		"0x0000000000000000000000000000000000000000";

	// Platform subscription price (matches default agent price: $9.99/month)
	const platformPrice = "$9.99";

	deps.logger.info({
		msg: "Initializing x402 subscription route",
		network,
		price: platformPrice,
		wallet: platformWallet,
	});

	// Apply x402 payment middleware at app level
	// This intercepts ALL requests to /create/:agentId and enforces payment
	app.use(
		paymentMiddleware(
			platformWallet as `0x${string}`,
			{
				"POST /create/:agentId": {
					price: platformPrice,
					network,
					config: {
						description: "Monthly AI Stylist subscription",
					},
				},
			},
			auto // Facilitator config is the auto-facilitator from @swader/x402facilitators
		)
	);

	// POST /create/:agentId - Create subscription (runs AFTER x402 payment verified)
	app.post("/create/:agentId", async (c) => {
		// Payment already verified by x402 middleware at this point
		const agentIdParam = c.req.param("agentId");

		// Validate and parse agentId
		let agentId: AgentId;
		try {
			agentId = AgentId.parse(agentIdParam);
		} catch {
			throw new HTTPException(400, { message: "Invalid agent ID format" });
		}

		// Fetch agent from database
		const agent = await deps.db.query.agentsTable.findFirst({
			where: eq(agentsTable.id, agentId),
		});

		if (!agent) {
			throw new HTTPException(404, { message: "Agent not found" });
		}

		if (!agent.active) {
			throw new HTTPException(400, {
				message: "Agent is not active and cannot accept subscriptions",
			});
		}

		// Get authenticated user from Better Auth
		const session = await deps.authClient.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.user?.id) {
			throw new HTTPException(401, { message: "Authentication required" });
		}

		const userId = UserId.parse(session.user.id);

		// Check if user already has active subscription to this agent
		const existingSubscription =
			await deps.db.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.userId, userId),
					eq(subscriptionsTable.agentId, agentId),
					eq(subscriptionsTable.status, "active")
				),
			});

		if (existingSubscription) {
			throw new HTTPException(400, {
				message: "You already have an active subscription to this agent",
			});
		}

		const now = new Date();

		// Payment proof - x402 middleware has already verified payment
		// Store metadata about the x402 payment
		const paymentProof: Record<string, unknown> = {
			protocol: "x402",
			network,
			price: platformPrice,
			agentId,
			timestamp: now.toISOString(),
			platformWallet,
		};

		const nextPaymentDue = new Date(now);
		nextPaymentDue.setDate(nextPaymentDue.getDate() + 30); // 30 days subscription

		// Create subscription record
		const [subscription] = await deps.db
			.insert(subscriptionsTable)
			.values({
				userId,
				agentId,
				priceMonthly: agent.priceMonthly,
				status: "active",
				lastPaymentAt: now,
				nextPaymentDue,
				startedAt: now,
			})
			.returning();

		if (!subscription) {
			throw new HTTPException(500, {
				message: "Failed to create subscription",
			});
		}

		// Create payment record with x402 proof
		const [payment] = await deps.db
			.insert(subscriptionPaymentsTable)
			.values({
				subscriptionId: subscription.id,
				amount: agent.priceMonthly,
				paymentMethod: "crypto",
				status: "completed",
				network,
				paymentProof,
				txHash: null, // TODO: Extract from x402 payment proof when available
				verifiedAt: now,
				paidAt: now,
			})
			.returning();

		deps.logger.info({
			msg: "Subscription created via x402",
			subscriptionId: subscription.id,
			userId,
			agentId,
			paymentId: payment?.id,
			network,
			price: platformPrice,
		});

		// Return subscription details
		return c.json({
			subscription,
			payment,
			agent: {
				id: agent.id,
				name: agent.name,
				description: agent.description,
			},
		});
	});

	return app;
};
