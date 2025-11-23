import { createLogger } from "@ai-stilist/logger";
import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { createDatabase } from "./db";
import { env } from "./env";
import { items } from "./items";
import { createPaymentMiddleware } from "./middleware/payment";

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
		allowHeaders: ["Content-Type", "X-PAYMENT"],
		exposeHeaders: ["X-PAYMENT-RESPONSE"],
	})
);

// Configuration
const network = env.APP_ENV === "prod" ? "polygon" : "polygon-amoy";

// Routes

// Health check
app.get("/", (c) =>
	c.json({
		name: "X402 Marketplace Server with AP2",
		version: "2.0.0",
		protocol: "x402 + AP2",
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

// Individual item routes with payment protection
// Dynamic routes for all items
for (const [index, item] of items.entries()) {
	app.get(
		`/api/items/${item.id}`,
		createPaymentMiddleware({
			item,
			merchantWallet: env.MERCHANT_WALLET_ADDRESS as `0x${string}`,
			network,
			rpcUrl: env.POLYGON_RPC_URL,
			db,
			logger,
		}),
		(c) => {
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

			return c.json({
				success: true,
				item: items[index],
				purchase: {
					id: item.id,
					signature: jwtPayload.payload.signature,
					timestamp: new Date().toISOString(),
				},
			});
		}
	);
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
	msg: "Starting X402 Marketplace Server with AP2",
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
	protocol: "X402 v1.0 with AP2 intent verification",
	features: [
		"EIP-712 signature verification",
		"Spending constraint validation",
		"On-chain payment verification",
		"Double-spend prevention",
		"Full audit trail",
	],
});
