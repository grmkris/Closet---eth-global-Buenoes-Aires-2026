import { createLogger } from "@ai-stilist/logger";
import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { paymentMiddleware } from "x402-hono";
import { purchasesTable } from "../drizzle/schema";
import { createDatabase } from "./db";
import { env } from "./env";
import { items } from "./items";

// Initialize logger
const logger = createLogger({
	level: "info",
	appName: "marketplace-server",
});

// Initialize database
const db = createDatabase(env.DATABASE_URL);

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"X-PAYMENT",
			"X-Wallet-Address",
			// Workaround: x402-fetch v0.7.3 incorrectly sends this as a request header
			"Access-Control-Expose-Headers",
		],
		exposeHeaders: ["X-PAYMENT-RESPONSE"],
		credentials: true,
	})
);

// Serve static files from public directory
app.use(
	"/festival-items/*",
	serveStatic({
		root: "./public",
		rewriteRequestPath: (path) => path,
	})
);

// Configuration
const network = env.APP_ENV === "prod" ? "polygon" : "polygon-amoy";

// Routes

// Health check
app.get("/", (c) =>
	c.json({
		name: "X402 Marketplace Server",
		version: "2.0.0",
		protocol: "x402",
		items: items.length,
		network,
	})
);

// List all items (public - no payment required)
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

const platformWallet = env.MERCHANT_WALLET_ADDRESS;
// Individual item routes with payment protection
// Dynamic routes for all items
for (const [index, item] of items.entries()) {
	app.use(
		paymentMiddleware(
			platformWallet as `0x${string}`,
			{
				[`POST /api/items/${item.id}`]: {
					price: item.price,
					network,
					config: {
						description: item.description,
						discoverable: true,
					},
				},
			},
			{
				url: "https://x402-amoy.polygon.technology",
			}
		)
	);

	// POST handler - runs AFTER x402 payment verified
	app.post(`/api/items/${item.id}`, async (c) => {
		// Decode X-PAYMENT header (same pattern as subscription route)
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
		const walletAddress = jwtPayload.payload.authorization.from;

		logger.info({
			msg: "Item purchase verified",
			itemId: item.id,
			wallet: walletAddress,
		});

		// Create purchase record (audit trail)
		const now = new Date();
		const purchaseId = `purchase-${Date.now()}-${Math.random().toString(36).substring(7)}`;

		await db.insert(purchasesTable).values({
			id: purchaseId,
			itemId: item.id,
			txHash: jwtPayload.payload.signature,
			userWalletAddress: walletAddress,
			agentWalletAddress: platformWallet,
			amount: Math.round(item.price * 100),
			network,
			paymentProof: {
				protocol: "x402",
				network,
				timestamp: now.toISOString(),
			},
			ap2Intent: null,
			itemSnapshot: item as unknown as Record<string, unknown>,
		});

		logger.info({
			msg: "Purchase recorded",
			purchaseId,
			itemId: item.id,
			wallet: walletAddress,
		});

		// Return item with purchase details
		return c.json({
			success: true,
			purchase: {
				id: purchaseId,
				timestamp: now.toISOString(),
				signature: jwtPayload.payload.signature,
			},
			item: {
				id: item.id,
				name: item.name,
				description: item.description,
				price: item.price,
				category: item.category,
				brand: item.brand,
				imageUrl: item.imageUrl,
				metadata: item.metadata,
				available: item.available,
			},
		});
	});
}

// Get purchase history (for debugging)
app.get("/api/purchases", async (c) => {
	const purchases = await db.query.purchasesTable.findMany({
		orderBy: (p, { desc }) => [desc(p.createdAt)],
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
	network,
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
	protocol: "X402 v1.0",
	features: [
		"Payment verification via x402-hono",
		"Purchase tracking",
		"Full audit trail",
	],
});
