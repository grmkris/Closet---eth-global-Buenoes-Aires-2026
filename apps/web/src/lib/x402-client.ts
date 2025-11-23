import type { WalletClient } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";

export type { createSigner } from "x402/types";

/**
 * Creates an x402-enabled fetch wrapper that automatically handles 402 Payment Required responses
 * Uses wagmi's injected provider (MetaMask, etc.) to sign payment authorizations
 */
export function createX402Fetch(props: { walletClient: WalletClient }) {
	// Wrap native fetch with x402 payment handling
	const fetchWithPayment = wrapFetchWithPayment(
		fetch,
		createSigner(props.walletClient)
	);

	return fetchWithPayment;
}

/**
 * Call an x402-protected endpoint
 * Automatically handles 402 → payment → retry flow
 */
export async function callX402Endpoint<T = unknown>(
	url: string,
	options?: RequestInit
): Promise<T> {
	const fetchWithPayment = createX402Fetch();

	const response = await fetchWithPayment(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Request failed: ${error}`);
	}

	return response.json() as Promise<T>;
}
