import { createLogger } from "@ai-stilist/logger";
import { serve } from "@hono/node-server";
import { auto } from "@swader/x402facilitators";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { paymentMiddleware } from "x402-hono";
import { createDatabase } from "./db";
import { env } from "./env";
import { items } from "./items";

// Initialize logger
const logger = createLogger({
	level: "info",
	name: "marketplace-server",
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

// Apply x402 payment middleware to protect individual item routes
app.use(
	paymentMiddleware(
		env.MERCHANT_WALLET_ADDRESS as `0x${string}`,
		{
			"GET /api/items/item-001": {
				price: "$299.99",
				network,
				config: {
					description: "Classic Leather Jacket - Heritage & Co",
				},
			},
			"GET /api/items/item-002": {
				price: "$89.99",
				network,
				config: {
					description: "Vintage Denim Jacket - Vintage Co",
				},
			},
			"GET /api/items/item-003": {
				price: "$79.99",
				network,
				config: {
					description: "White Canvas Sneakers - Urban Stride",
				},
			},
			"GET /api/items/item-004": {
				price: "$189.99",
				network,
				config: {
					description: "Black Chelsea Boots - Heritage & Co",
				},
			},
			"GET /api/items/item-005": {
				price: "$249.99",
				network,
				config: {
					description: "Cashmere Sweater - Luxury Knits",
				},
			},
			"GET /api/items/item-006": {
				price: "$129.99",
				network,
				config: {
					description: "Tailored Wool Trousers - Formal House",
				},
			},
			"GET /api/items/item-007": {
				price: "$159.99",
				network,
				config: {
					description: "Silk Scarf - Luxury House",
				},
			},
			"GET /api/items/item-008": {
				price: "$199.99",
				network,
				config: {
					description: "Leather Crossbody Bag - Heritage & Co",
				},
			},
			"GET /api/items/item-009": {
				price: "$179.99",
				network,
				config: {
					description: "Merino Wool Cardigan - Luxury Knits",
				},
			},
			"GET /api/items/item-010": {
				price: "$69.99",
				network,
				config: {
					description: "Slim Fit Chinos - Urban Stride",
				},
			},
		},
		auto // Auto-discovers Polygon's facilitator
	)
);

// Routes

// Health check
app.get("/", (c) =>
	c.json({
		name: "X402 Marketplace Server",
		version: "1.0.0",
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

// Get single item (X402 protected - payment required)
app.get("/api/items/:id", async (c) => {
	const itemId = c.req.param("id");
	const item = items.find((i) => i.id === itemId);

	if (!item) {
		return c.json({ error: "Item not found" }, 404);
	}

	if (!item.available) {
		return c.json({ error: "Item not available" }, 404);
	}

	// Payment already verified by middleware!
	// If we reach here, payment was successful
	logger.info({
		msg: "Item purchased",
		itemId: item.id,
		price: item.price,
	});

	return c.json({
		success: true,
		item,
		message: "Payment verified - item purchased successfully",
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
	protocol: "X402 v1.0 with Polygon facilitator",
	facilitator: "auto-discovery (Polygon)",
});
