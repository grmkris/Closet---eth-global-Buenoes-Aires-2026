import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import { createX402Fetch } from "@/lib/x402-client";

/**
 * React hook that provides x402-enabled fetch with current connected wallet
 *
 * Automatically handles 402 Payment Required responses by:
 * 1. Parsing payment requirements from 402 response
 * 2. Creating payment authorization with connected wallet
 * 3. Signing authorization with user's private key
 * 4. Retrying request with signed payment proof
 *
 * @returns Object with x402Fetch function and ready state
 *
 * @example
 * ```tsx
 * const { x402Fetch, isReady } = useX402Fetch();
 *
 * if (!isReady) {
 *   return <div>Please connect your wallet</div>;
 * }
 *
 * const response = await x402Fetch('/api/subscription/create/agent_123', {
 *   method: 'POST'
 * });
 * ```
 */
export function useX402Fetch() {
	const { data: walletClient, isLoading } = useWalletClient();

	const x402Fetch = useMemo(() => {
		if (!walletClient) {
			return null;
		}
		return createX402Fetch(walletClient);
	}, [walletClient]);

	return {
		/**
		 * X402-enabled fetch function
		 * Null if wallet not connected
		 */
		x402Fetch,

		/**
		 * True when wallet is connected and x402Fetch is ready to use
		 */
		isReady: !!x402Fetch && !isLoading,

		/**
		 * True while wallet client is being loaded
		 */
		isLoading,
	};
}
