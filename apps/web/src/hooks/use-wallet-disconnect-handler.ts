"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

/**
 * Hook that handles automatic logout when CDP wallet disconnects.
 * Monitors wagmi connection state and signs out from Better Auth when wallet disconnects.
 */
export function useWalletDisconnectHandler() {
	const { isConnected } = useAccount();
	const previouslyConnected = useRef(isConnected);

	useEffect(() => {
		// Detect transition from connected to disconnected
		if (previouslyConnected.current && !isConnected) {
			// Wallet was disconnected, sign out from Better Auth
			authClient
				.signOut({
					fetchOptions: {
						onSuccess: () => {
							// Redirect to home page after logout
							window.location.href = "/";
						},
					},
				})
				.catch((error) => {
					logger.error("Failed to sign out after wallet disconnect:", error);
				});
		}

		// Update ref for next render
		previouslyConnected.current = isConnected;
	}, [isConnected]);
}
