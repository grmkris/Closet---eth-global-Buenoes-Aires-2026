import type { WalletClient } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";

/**
 * Creates an x402-enabled fetch wrapper that automatically handles 402 Payment Required responses
 *
 * This is a low-level utility that converts a viem WalletClient into an x402-enabled fetch function.
 * The returned fetch will automatically:
 * 1. Detect 402 Payment Required responses
 * 2. Parse payment requirements from x402 headers
 * 3. Create and sign payment authorization with the wallet
 * 4. Retry the request with signed payment proof
 *
 * **Usage in React components**: Use the `useX402Fetch()` hook instead of calling this directly.
 * The hook provides proper wallet context and React lifecycle management.
 *
 * @param walletClient - Viem WalletClient from wagmi's useWalletClient() hook
 * @returns Fetch function that auto-handles x402 payments
 *
 * @example
 * ```typescript
 * // Low-level usage (not recommended in React)
 * const fetchWithPayment = createX402Fetch(walletClient);
 * const response = await fetchWithPayment('/api/endpoint');
 *
 * // Recommended: Use the React hook instead
 * const { x402Fetch } = useX402Fetch();
 * const response = await x402Fetch('/api/endpoint');
 * ```
 */
export function createX402Fetch(walletClient: WalletClient) {
	if (!walletClient.chain) {
		throw new Error("Wallet client chain is not set");
	}
	if (!walletClient.account) {
		throw new Error("Wallet client account is not set");
	}
	// @ts-expect-error - wrapFetchWithPayment is not typed
	return wrapFetchWithPayment(fetch, walletClient, 2_000_000_000_000_000_000);
}
