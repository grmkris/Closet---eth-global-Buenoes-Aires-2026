"use client";

import { USDC_ADDRESSES, WALLET_UI_CONFIG } from "@ai-stilist/shared/constants";
import { useState } from "react";
import { toast } from "sonner";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAddress } from "@/lib/utils";

export function WalletBadge() {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const [copied, setCopied] = useState(false);

	// Get USDC balance with auto-refresh every 30 seconds
	const { data: usdcBalance, isLoading } = useReadContract({
		abi: erc20Abi,
		address: USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES],
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && isConnected,
			refetchInterval: 30_000, // Auto-refresh every 30 seconds
		},
	});

	// Copy address to clipboard
	const copyAddress = async () => {
		if (!address) {
			return;
		}

		try {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			toast.success("Address copied to clipboard!");
			setTimeout(
				() => setCopied(false),
				WALLET_UI_CONFIG.TOAST_COPY_TIMEOUT_MS
			);
		} catch (_error) {
			toast.error("Failed to copy address");
		}
	};

	// Hide completely when wallet not connected
	if (!(isConnected && address)) {
		return null;
	}

	// Format USDC balance for display
	const formattedBalance = usdcBalance
		? Number.parseFloat(formatUnits(usdcBalance, 6)).toFixed(
				WALLET_UI_CONFIG.USDC_DECIMALS
			)
		: "0.00";

	const truncatedAddress = formatAddress(address);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						className="cursor-pointer font-mono text-xs"
						onClick={copyAddress}
						variant="secondary"
					>
						{isLoading ? (
							<span className="animate-pulse">Loading...</span>
						) : (
							<>
								{truncatedAddress} • ${formattedBalance} USDC
							</>
						)}
					</Badge>
				</TooltipTrigger>
				<TooltipContent>
					<p className="font-mono text-xs">
						{copied ? "Copied!" : "Click to copy address"}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
