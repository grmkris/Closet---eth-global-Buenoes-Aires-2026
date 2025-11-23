"use client";

import { USDC_ADDRESSES, WALLET_UI_CONFIG } from "@ai-stilist/shared/constants";
import { Wallet } from "lucide-react";
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
import { formatAddress, formatCompactNumber } from "@/lib/utils";

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

	// Format USDC balance for display
	const balanceNumber = usdcBalance
		? Number.parseFloat(formatUnits(usdcBalance, 6))
		: 0;

	const compactBalance = formatCompactNumber(balanceNumber, 1);
	const fullBalance = balanceNumber.toFixed(WALLET_UI_CONFIG.USDC_DECIMALS);
	const truncatedAddress = address ? formatAddress(address) : "";

	// Render consistent wrapper to avoid hydration mismatch
	// suppressHydrationWarning handles server/client state differences
	return (
		<div suppressHydrationWarning>
			{isConnected && address && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								className="group flex cursor-pointer items-center gap-1.5 font-mono text-xs transition-all hover:scale-[1.02]"
								onClick={copyAddress}
								variant="secondary"
							>
								{isLoading ? (
									<span className="animate-pulse">Loading...</span>
								) : (
									<>
										<Wallet className="size-3.5 shrink-0" />
										<span className="font-semibold">${compactBalance}</span>
									</>
								)}
							</Badge>
						</TooltipTrigger>
						<TooltipContent className="font-mono text-xs">
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">
									{copied ? "✓ Copied!" : "Click to copy"}
								</p>
								<p className="font-semibold">{truncatedAddress}</p>
								<p className="text-muted-foreground">${fullBalance} USDC</p>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
}
