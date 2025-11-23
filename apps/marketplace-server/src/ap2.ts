import { verifyMessage } from "viem";
import type { AP2Intent, MarketplaceItem } from "./types";

export async function verifyAP2Intent(
	intent: AP2Intent,
	signature: string
): Promise<{ valid: boolean; error?: string }> {
	try {
		// Construct the message that was signed
		const message = JSON.stringify(intent, null, 2);

		// Verify signature
		const isValid = await verifyMessage({
			address: intent.userId as `0x${string}`,
			message,
			signature: signature as `0x${string}`,
		});

		if (!isValid) {
			return { valid: false, error: "Invalid signature" };
		}

		// Check if intent is still valid (not expired)
		const now = new Date();
		const validFrom = new Date(intent.validFrom);
		const validUntil = new Date(intent.validUntil);

		if (now < validFrom) {
			return { valid: false, error: "Intent not yet valid" };
		}

		if (now > validUntil) {
			return { valid: false, error: "Intent expired" };
		}

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

export function validatePurchaseAgainstIntent(
	item: MarketplaceItem,
	intent: AP2Intent
): { allowed: boolean; reason?: string } {
	// Convert price to cents for comparison
	const priceCents = Math.round(item.price * 100);

	// Check max per transaction
	if (priceCents > intent.maxPerTransaction) {
		return {
			allowed: false,
			reason: `Price ($${item.price}) exceeds max per transaction ($${intent.maxPerTransaction / 100})`,
		};
	}

	// Check allowed categories
	if (!intent.allowedCategories.includes(item.category)) {
		return {
			allowed: false,
			reason: `Category "${item.category}" not in allowed categories: ${intent.allowedCategories.join(", ")}`,
		};
	}

	// Check allowed brands (if specified)
	if (
		intent.allowedBrands &&
		intent.allowedBrands.length > 0 &&
		!intent.allowedBrands.includes(item.brand)
	) {
		return {
			allowed: false,
			reason: `Brand "${item.brand}" not in allowed brands: ${intent.allowedBrands.join(", ")}`,
		};
	}

	return { allowed: true };
}
