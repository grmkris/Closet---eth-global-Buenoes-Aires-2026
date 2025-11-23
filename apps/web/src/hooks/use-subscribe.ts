import { SERVICE_URLS } from "@ai-stilist/shared/services";
import type { AgentId, SubscriptionId } from "@ai-stilist/shared/typeid";
import { useState } from "react";
import { env } from "@/env";
import { useX402Fetch } from "./use-x402-fetch";

type SubscribeResponse = {
	subscription: {
		id: SubscriptionId;
		userId: string;
		agentId: AgentId;
		priceMonthly: number;
		status: string;
		lastPaymentAt: Date | null;
		nextPaymentDue: Date | null;
		startedAt: Date;
		cancelledAt: Date | null;
	};
	payment: {
		id: string;
		subscriptionId: SubscriptionId;
		amount: number;
		paymentMethod: string;
		status: string;
		network: string;
		txHash: string | null;
		verifiedAt: Date | null;
		paidAt: Date | null;
	};
	agent: {
		id: AgentId;
		name: string;
		description: string;
	};
};

type SubscribeError = {
	message: string;
	status?: number;
};

/**
 * React hook for subscribing to an agent with x402 payment
 *
 * Handles the complete subscription flow:
 * 1. Makes POST request to /api/subscription/create/:agentId
 * 2. Backend returns 402 Payment Required with payment details
 * 3. x402-fetch automatically prompts user to sign payment
 * 4. Request retried with signed payment proof
 * 5. Backend verifies payment and creates subscription
 *
 * @returns Subscribe function, loading state, error state, and response data
 *
 * @example
 * ```tsx
 * const { subscribe, isLoading, error, data } = useSubscribe();
 *
 * const handleSubscribe = async () => {
 *   try {
 *     const result = await subscribe('agent_abc123');
 *     console.log('Subscribed!', result.subscription);
 *   } catch (err) {
 *     console.error('Subscription failed', err);
 *   }
 * };
 * ```
 */
export function useSubscribe() {
	const { x402Fetch, isReady } = useX402Fetch();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<SubscribeError | null>(null);
	const [data, setData] = useState<SubscribeResponse | null>(null);

	const subscribe = async (): Promise<SubscribeResponse> => {
		if (!(isReady && x402Fetch)) {
			throw new Error(
				"Wallet not connected. Please connect your wallet first."
			);
		}

		setIsLoading(true);
		setError(null);
		setData(null);

		try {
			const response = await x402Fetch(
				`${SERVICE_URLS[env.NEXT_PUBLIC_APP_ENV].api}/api/subscription/create`,
				{
					method: "GET",
				}
			);

			console.log("response", response);
			if (!response.ok) {
				const errorText = await response.text();
				let errorMessage: string;

				try {
					const errorJson = JSON.parse(errorText);
					errorMessage = errorJson.message || errorText;
				} catch {
					errorMessage = errorText;
				}

				const subscribeError: SubscribeError = {
					message: errorMessage,
					status: response.status,
				};

				setError(subscribeError);
				throw new Error(errorMessage);
			}

			const result: SubscribeResponse = await response.json();
			setData(result);
			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Subscription failed";
			const subscribeError: SubscribeError = {
				message: errorMessage,
			};
			setError(subscribeError);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		/**
		 * Subscribe to an agent
		 * @param agentId - Agent TypeID to subscribe to
		 * @returns Promise resolving to subscription details
		 * @throws Error if wallet not connected or subscription fails
		 */
		subscribe,

		/**
		 * True while subscription request is in progress
		 */
		isLoading,

		/**
		 * Error object if subscription failed
		 */
		error,

		/**
		 * Subscription response data if successful
		 */
		data,

		/**
		 * True when wallet is connected and ready to subscribe
		 */
		canSubscribe: isReady,
	};
}
