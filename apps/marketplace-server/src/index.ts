import { createLogger } from "@ai-stilist/logger";
import { serve } from "@hono/node-server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { createPublicClient, http } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { purchasesTable } from "../drizzle/schema";
import { validatePurchaseAgainstIntent, verifyAP2Intent } from "./ap2";
import { createDatabase } from "./db";
import { env } from "./env";
import { items } from "./items";
import type {
	X402PaymentRequirement,
	XPaymentHeader,
	XPaymentResponse,
} from "./types";

// Initialize logger
const logger = createLogger({
	level: "info",
	name: "marketplace-server",
});

// Initialize database
const db = createDatabase(env.DATABASE_URL);

// Initialize viem client for blockchain verification
const viemClient = createPublicClient({
	chain: env.APP_ENV === "prod" ? polygon : polygonAmoy,
	transport: http(env.POLYGON_RPC_URL),
});

// Initialize X402 client
const x402Client = createX402Client({
	facilitatorUrl: env.FACILITATOR_URL,
	viemClient,
	logger,
});

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "X-PAYMENT"],
		exposeHeaders: ["X-PAYMENT-RESPONSE"],
	})
);

// Routes

// Health check
app.get("/", (c) =>
	c.json({
		name: "X402 Marketplace Server",
		version: "1.0.0",
		protocol: "x402",
		items: items.length,
	})
);

// List all items (public)
app.get("/api/items", (c) => {
	const category = c.req.query("category");
	const minPrice = c.req.query("minPrice");
	const maxPrice = c.req.query("maxPrice");

	let filteredItems = items.filter((item) => item.available);

	if (category) {
		filteredItems = filteredItems.filter((item) => item.category === category);
	}

	if (minPrice) {
		filteredItems = filteredItems.filter(
			(item) => item.price >= Number(minPrice)
		);
	}

	if (maxPrice) {
		filteredItems = filteredItems.filter(
			(item) => item.price <= Number(maxPrice)
		);
	}

	return c.json({
		items: filteredItems,
		total: filteredItems.length,
	});
});

// Get single item (X402 protocol)
app.get("/api/items/:id", async (c) => {
	const itemId = c.req.param("id");
	const item = items.find((i) => i.id === itemId);

	if (!item) {
		return c.json({ error: "Item not found" }, 404);
	}

	if (!item.available) {
		return c.json({ error: "Item not available" }, 404);
	}

	// Check for X-PAYMENT header
	const xPaymentHeader = c.req.header("X-PAYMENT");

	if (!xPaymentHeader) {
		// No payment provided - return 402 Payment Required
		const paymentRequirement: X402PaymentRequirement = {
			x402Version: "1.0",
			accepts: [
				{
					amount: item.price.toFixed(2),
					currency: "USDC",
					network: "base-mainnet",
					recipient: MERCHANT_WALLET_ADDRESS,
				},
			],
			paymentMethods: ["crypto"],
			item: {
				id: item.id,
				name: item.name,
				price: item.price,
				category: item.category,
			},
		};

		return c.json(paymentRequirement, 402);
	}

	// Payment provided - verify it
	try {
		const payment: XPaymentHeader = JSON.parse(xPaymentHeader);

		// 1. Verify AP2 intent signature
		const intentVerification = await verifyAP2Intent(
			payment.ap2Intent,
			payment.ap2Signature
		);

		if (!intentVerification.valid) {
			return c.json(
				{
					error: "AP2 intent verification failed",
					details: intentVerification.error,
				},
				403
			);
		}

		// 2. Validate purchase against intent constraints
		const purchaseValidation = validatePurchaseAgainstIntent(
			item,
			payment.ap2Intent
		);

		if (!purchaseValidation.allowed) {
			return c.json(
				{
					error: "Purchase not allowed by spending authorization",
					details: purchaseValidation.reason,
				},
				403
			);
		}

		// 3. Check for double-spend (database query)
		const existingPurchase = await db.query.purchasesTable.findFirst({
			where: eq(purchasesTable.txHash, payment.txHash),
		});

		if (existingPurchase) {
			return c.json(
				{
					error: "Transaction hash already used",
				},
				409
			);
		}

		// 4. Verify payment on-chain via X402
		const requirements = x402Client.createPaymentRequirements({
			resource: `/items/${itemId}`,
			price: `${item.price}`,
			recipient: env.MERCHANT_WALLET_ADDRESS as `0x${string}`,
			network: env.APP_ENV === "prod" ? "polygon" : "polygon-amoy",
		});

		logger.info({
			msg: "Verifying payment on-chain",
			txHash: payment.txHash,
			requirements,
		});

		const verification = await x402Client.verifyPayment(
			payment.txHash as `0x${string}`,
			requirements
		);

		if (!verification.valid) {
			logger.error({
				msg: "Payment verification failed",
				txHash: payment.txHash,
				error: verification.error,
			});
			return c.json(
				{
					error: "Payment verification failed",
					details: verification.error,
				},
				402
			);
		}

		logger.info({
			msg: "Payment verified successfully",
			txHash: payment.txHash,
			from: verification.proof?.from,
			to: verification.proof?.to,
			amount: verification.proof?.amount,
		});

		// 5. Store purchase in database
		const purchaseId = `purchase-${Date.now()}-${Math.random().toString(36).substring(7)}`;

		await db.insert(purchasesTable).values({
			id: purchaseId,
			itemId: item.id,
			txHash: payment.txHash,
			userWalletAddress: payment.ap2Intent.userId,
			agentWalletAddress: payment.ap2Intent.agentId,
			amount: Math.round(item.price * 100),
			network: env.APP_ENV === "prod" ? "polygon" : "polygon-amoy",
			paymentProof: verification.proof as unknown as Record<string, unknown>,
			ap2Intent: payment.ap2Intent as unknown as Record<string, unknown>,
			itemSnapshot: item as unknown as Record<string, unknown>,
		});

		logger.info({
			msg: "Purchase recorded",
			purchaseId,
			itemId: item.id,
			txHash: payment.txHash,
		});

		// 6. Return success with X-PAYMENT-RESPONSE header
		const paymentResponse: XPaymentResponse = {
			txHash: payment.txHash,
			status: "confirmed",
			purchaseId,
		};

		c.header("X-PAYMENT-RESPONSE", JSON.stringify(paymentResponse));

		return c.json({
			success: true,
			purchase: {
				id: purchaseId,
				item,
				txHash: payment.txHash,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		logger.error({
			msg: "Payment processing failed",
			error,
		});
		return c.json(
			{
				error: "Payment processing failed",
				details: error instanceof Error ? error.message : String(error),
			},
			400
		);
	}
});

// Get purchase history (for debugging)
app.get("/api/purchases", async (c) => {
	const purchases = await db.query.purchasesTable.findMany({
		orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
	});

	return c.json({
		purchases,
		total: purchases.length,
	});
});

// Start server
logger.info({
	msg: "Starting X402 Marketplace Server",
	port: env.PORT,
	merchantWallet: env.MERCHANT_WALLET_ADDRESS,
	corsOrigin: env.CORS_ORIGIN,
	appEnv: env.APP_ENV,
});

serve({
	fetch: app.fetch,
	port: env.PORT,
});

logger.info({
	msg: "Server running",
	url: `http://localhost:${env.PORT}`,
	itemsEndpoint: "/api/items",
	protocol: "X402 v1.0 with AP2 intent verification",
});
