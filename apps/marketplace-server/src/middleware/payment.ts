import type { Logger } from "@ai-stilist/logger";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { Address } from "viem";
import { purchasesTable } from "../../drizzle/schema";
import { validatePurchaseAgainstIntent, verifyAP2Intent } from "../ap2";
import type { Database } from "../db";
import { createPaymentRequirements, verifyPaymentOnChain } from "../payment";
import type { MarketplaceItem, XPaymentHeader } from "../types";

export type PaymentMiddlewareConfig = {
	item: MarketplaceItem;
	merchantWallet: Address;
	network: "polygon" | "polygon-amoy";
	rpcUrl?: string;
	db: Database;
	logger: Logger;
};

/**
 * Custom middleware that verifies both AP2 intent and payment
 */
export function createPaymentMiddleware(config: PaymentMiddlewareConfig) {
	const { item, merchantWallet, network, rpcUrl, db, logger } = config;

	return async (c: Context, next: Next) => {
		// Check for X-PAYMENT header
		const xPaymentHeader = c.req.header("X-PAYMENT");

		if (!xPaymentHeader) {
			// No payment provided - return 402 Payment Required
			const requirements = createPaymentRequirements({
				itemId: item.id,
				itemName: item.name,
				price: item.price,
				category: item.category,
				recipient: merchantWallet,
				network,
			});

			return c.json(requirements, 402);
		}

		// Payment provided - verify it
		try {
			const payment: XPaymentHeader = JSON.parse(xPaymentHeader);

			// 1. Verify AP2 intent signature
			logger.debug({
				msg: "Verifying AP2 intent",
				itemId: item.id,
				userId: payment.ap2Intent.userId,
			});

			const intentVerification = await verifyAP2Intent(
				payment.ap2Intent,
				payment.ap2Signature
			);

			if (!intentVerification.valid) {
				logger.warn({
					msg: "AP2 intent verification failed",
					error: intentVerification.error,
				});

				return c.json(
					{
						error: "AP2 intent verification failed",
						details: intentVerification.error,
					},
					403
				);
			}

			// 2. Validate purchase against intent constraints
			logger.debug({
				msg: "Validating purchase against intent constraints",
				itemId: item.id,
				price: item.price,
				category: item.category,
			});

			const purchaseValidation = validatePurchaseAgainstIntent(
				item,
				payment.ap2Intent
			);

			if (!purchaseValidation.allowed) {
				logger.warn({
					msg: "Purchase not allowed by spending authorization",
					reason: purchaseValidation.reason,
				});

				return c.json(
					{
						error: "Purchase not allowed by spending authorization",
						details: purchaseValidation.reason,
					},
					403
				);
			}

			// 3. Check for double-spend (database query)
			logger.debug({
				msg: "Checking for duplicate transaction",
				txHash: payment.txHash,
			});

			const existingPurchase = await db.query.purchasesTable.findFirst({
				where: eq(purchasesTable.txHash, payment.txHash),
			});

			if (existingPurchase) {
				logger.warn({
					msg: "Transaction hash already used",
					txHash: payment.txHash,
				});

				return c.json(
					{
						error: "Transaction hash already used",
					},
					409
				);
			}

			// 4. Verify payment on-chain
			logger.info({
				msg: "Verifying payment on-chain",
				txHash: payment.txHash,
				expectedAmount: item.price,
				recipient: merchantWallet,
			});

			const verification = await verifyPaymentOnChain({
				txHash: payment.txHash,
				expectedAmount: item.price,
				expectedRecipient: merchantWallet,
				network,
				rpcUrl,
			});

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
				network,
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

			// 6. Store payment data in context for handler
			c.set("payment", {
				ap2Intent: payment.ap2Intent,
				txHash: payment.txHash,
				verification: verification.proof,
				purchaseId,
			});

			// 7. Add X-PAYMENT-RESPONSE header
			c.header(
				"X-PAYMENT-RESPONSE",
				JSON.stringify({
					txHash: payment.txHash,
					status: "confirmed",
					purchaseId,
				})
			);

			// 8. Continue to handler
			await next();
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
	};
}
