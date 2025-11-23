"use client";

import type { AgentId } from "@ai-stilist/shared/typeid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useSignTypedData } from "wagmi";
import type { PaymentRequirements } from "@/utils/orpc-types";

type UseGaslessSubscribeProps = {
	agentId: AgentId;
	requirements: PaymentRequirements;
	userAddress: Address;
};
const NONCE = 1_234_567_890;
export function useGaslessSubscribe({
	requirements,
	userAddress,
}: UseGaslessSubscribeProps) {
	const queryClient = useQueryClient();
	const { signTypedDataAsync } = useSignTypedData();

	return useMutation({
		mutationFn: async () => {
			// 1. Parse price from requirements (format: "$0.001" or "0.001")
			const priceUsd = requirements.price.replace("$", "");
			const priceInMicroUsdc = parseUnits(priceUsd, 6); // USDC has 6 decimals

			// 2. Create EIP-3009 authorization
			const now = Math.floor(Date.now() / 1000);
			const authorization = {
				from: userAddress,
				to: requirements.recipient,
				value: priceInMicroUsdc,
				validAfter: now,
				validBefore: now + 1800, // 30 minutes validity
				nonce: NONCE,
			};

			// 3. EIP-712 domain for USDC contract
			const domain = {
				name: "USD Coin",
				version: "2",
				chainId: requirements.chainId,
				verifyingContract: requirements.usdcAddress,
			};

			// 4. EIP-712 types for TransferWithAuthorization
			const types = {
				TransferWithAuthorization: [
					{ name: "from", type: "address" },
					{ name: "to", type: "address" },
					{ name: "value", type: "uint256" },
					{ name: "validAfter", type: "uint256" },
					{ name: "validBefore", type: "uint256" },
					{ name: "nonce", type: "bytes32" },
				],
			};

			// 5. Sign the authorization
			toast.info("Please sign the payment authorization in your wallet");
			const signature = await signTypedDataAsync({
				domain,
				types,
				primaryType: "TransferWithAuthorization",
				message: authorization,
			});

			return signature;
		},
		onSuccess: () => {
			// Invalidate subscriptions list
			queryClient.invalidateQueries({
				queryKey: ["subscription", "list"],
			});
		},
		onError: (error) => {
			console.error("Subscription failed:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			toast.error("Subscription failed", {
				description: errorMessage,
			});
		},
	});
}
