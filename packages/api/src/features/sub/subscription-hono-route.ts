import { and, eq } from "@ai-stilist/db/drizzle";
import { walletAddress } from "@ai-stilist/db/schema/auth";
import {
	subscriptionPaymentsTable,
	subscriptionsTable,
} from "@ai-stilist/db/schema/subscriptions";
import { type Environment, SERVICE_URLS } from "@ai-stilist/shared/services";
import { UserId } from "@ai-stilist/shared/typeid";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { paymentMiddleware } from "x402-hono";
import type { ContextDeps } from "../../context";
export const createSubscriptionHonoRoute = (deps: ContextDeps) => {
	// Get platform configuration
	const appEnv: Environment = deps.appEnv || "dev";
	const network = appEnv === "prod" ? "polygon" : "polygon-amoy";
	const platformWallet =
		process.env.DEFAULT_AGENT_WALLET_ADDRESS ||
		"0x0000000000000000000000000000000000000000";

	// Platform subscription price (matches default agent price: $9.99/month)
	const platformPrice = "$0.01";

	deps.logger.info({
		msg: "Initializing x402 subscription route",
		network,
		price: platformPrice,
		wallet: platformWallet,
	});

	// Apply CORS middleware to handle preflight requests
	// Must come before x402 payment middleware
	return new Hono()
		.use(
			"/*",
			cors({
				origin: SERVICE_URLS[appEnv].web,
				allowMethods: ["GET", "POST", "OPTIONS"],
				allowHeaders: ["Content-Type", "Authorization", "X-PAYMENT"],
				exposeHeaders: ["X-PAYMENT-RESPONSE"],
			})
		)
		.use(
			paymentMiddleware(
				platformWallet as `0x${string}`,
				{
					"/api/subscription/create": {
						price: platformPrice,
						network,
						config: {
							description: "Monthly AI Stylist subscription",
						},
					},
				},
				{
					url: "https://x402-amoy.polygon.technology",
				}
			)
			// // POST /create/:agentId - Create subscription (runs AFTER x402 payment verified)
		)
		.post("/create", async (c) => {
			// Payment already verified by x402 middleware at this point

			deps.logger.info({
				msg: "Creating subscription",
				walletAddress: c.req.header("x-payment"),
			});

			/**
			 * {
  "x402Version": 1,
  "scheme": "exact",
  "network": "polygon-amoy",
  "payload": {
    "signature": "0x5ec67a83aff70e7db7012de0dfee37d43c563ad2385fcac1682ec0e2562bf0af4a4023b25cd99a89c3811f1aa70264021ae7e929831513f65c2fec0cac12546d1b",
    "authorization": {
      "from": "0x13f090053413B495C78F905991daC26110E34c2F",
      "to": "0x81d786b35f3EA2F39Aa17cb18d9772E4EcD97206",
      "value": "9990000",
      "validAfter": "1763873172",
      "validBefore": "1763874072",
      "nonce": "0x284dd0e8246fc233b4ecdbb680198ffe037dd0a49bf981b1f4af89e40e8a92b4"
    }
  }
}
			 */
			// decode wallet address from base64
			const xPaymentHeader = c.req.header("x-payment");
			if (!xPaymentHeader) {
				return c.json(
					{
						error: "X-PAYMENT header is required",
					},
					400
				);
			}
			const decodedJWT = atob(xPaymentHeader);
			const jwtPayload = JSON.parse(decodedJWT);
			console.log(jwtPayload);
			const walletAddressDecoded = jwtPayload.payload.authorization.from;
			console.log(walletAddressDecoded);

			// Get user by wallet address
			const walletAddressDb = await deps.db.query.walletAddress.findFirst({
				where: eq(walletAddress.address, walletAddressDecoded),
				with: {
					user: true,
				},
			});

			deps.logger.info({
				qqqqq: "Wallet address found",
				walletAddress: walletAddressDecoded,
				userId: walletAddressDb?.user.id,
			});

			const userId = UserId.parse(walletAddressDb?.user.id);

			// Check if user already has active subscription to this agent
			const existingSubscription =
				await deps.db.query.subscriptionsTable.findFirst({
					where: and(
						eq(subscriptionsTable.userId, userId),
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
					priceMonthly: 0.001,
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
					amount: 0.001,
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
				paymentId: payment?.id,
				network,
				price: platformPrice,
			});

			// Return subscription details
			return c.json({
				subscription,
				payment,
			});
		});
};
