"use client";

import { SERVICE_URLS } from "@ai-stilist/shared/services";
import { useMutation } from "@tanstack/react-query";
import { SiweMessage } from "siwe";
import { useSignMessage } from "wagmi";
import { env } from "@/env";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

type SiweAuthParams = {
	address: string;
	chainId: number;
};

type UseSiweAuthenticationOptions = {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
};

/**
 * Hook for authenticating users via Sign-In with Ethereum (SIWE).
 * Handles the complete flow: nonce generation, message signing, and verification.
 *
 * @example
 * ```tsx
 * const { authenticate, isPending, error } = useSiweAuthentication({
 *   onSuccess: () => router.push("/dashboard"),
 * });
 *
 * // Trigger authentication
 * authenticate({ address: "0x...", chainId: 8453 });
 * ```
 */
export function useSiweAuthentication(
	options: UseSiweAuthenticationOptions = {}
) {
	const { signMessageAsync } = useSignMessage();

	const mutation = useMutation({
		mutationFn: async ({ address, chainId }: SiweAuthParams) => {
			// Step 1: Get nonce from server
			const { data: nonceData, error: nonceError } =
				await authClient.siwe.nonce({
					walletAddress: address,
					chainId,
				});

			if (nonceError || !nonceData?.nonce) {
				throw new Error("Failed to get nonce from server");
			}

			// Step 2: Create SIWE message
			const siweMessage = new SiweMessage({
				domain: new URL(SERVICE_URLS[env.NEXT_PUBLIC_APP_ENV].auth).hostname,
				address,
				statement: "Sign in to AI Stilist with your wallet",
				uri: window.location.origin,
				version: "1",
				chainId,
				nonce: nonceData.nonce,
			});

			// Step 3: Sign the message with the user's wallet
			const messageString = siweMessage.prepareMessage();
			const signature = await signMessageAsync({ message: messageString });

			// Step 4: Verify the signature on the server
			const { data: verifyData, error: verifyError } =
				await authClient.siwe.verify({
					message: messageString,
					signature,
					walletAddress: address,
					chainId,
				});

			if (verifyError) {
				throw new Error(verifyError.message || "SIWE verification failed");
			}

			return verifyData;
		},
		onSuccess: () => {
			options.onSuccess?.();
		},
		onError: (error: Error) => {
			logger.error({ msg: "SIWE authentication failed", error });
			options.onError?.(error);
		},
	});

	return {
		/**
		 * Trigger SIWE authentication flow
		 */
		authenticate: mutation.mutate,
		/**
		 * Async version that returns a promise
		 */
		authenticateAsync: mutation.mutateAsync,
		/**
		 * True while authentication is in progress
		 */
		isPending: mutation.isPending,
		/**
		 * Error object if authentication failed
		 */
		error: mutation.error,
		/**
		 * True if the mutation has failed
		 */
		isError: mutation.isError,
		/**
		 * Reset mutation state (clears error)
		 */
		reset: mutation.reset,
	};
}
