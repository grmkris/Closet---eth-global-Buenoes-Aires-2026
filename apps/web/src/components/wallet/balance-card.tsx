"use client";

import { CHAIN_IDS, USDC_ADDRESSES } from "@ai-stilist/shared/constants";
import { useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { DepositModal } from "./deposit-modal";

export function WalletBalanceCard() {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

	// Get USDC balance
	const {
		data: usdcBalance,
		isLoading: isLoadingUsdc,
		refetch: refetchUsdc,
	} = useReadContract({
		abi: erc20Abi,
		address: USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES],
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && isConnected,
		},
	});

	if (!isConnected) {
		return (
			<div className="rounded-lg border p-6">
				<h3 className="font-semibold text-lg">Wallet Balance</h3>
				<p className="mt-4 text-muted-foreground">
					Connect your wallet to view balance
				</p>
			</div>
		);
	}

	// Format USDC balance for display
	const formattedUsdcBalance = usdcBalance
		? formatUnits(usdcBalance, 6)
		: "0.00";

	return (
		<>
			<div className="rounded-lg border p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-lg">Wallet Balance</h3>
					<Button
						disabled={isLoadingUsdc}
						onClick={() => refetchUsdc()}
						size="sm"
						variant="ghost"
					>
						{isLoadingUsdc ? "..." : "Refresh"}
					</Button>
				</div>

				{/* USDC Balance */}
				<div className="mt-4">
					<div className="flex items-baseline justify-center gap-2">
						<span className="font-bold text-4xl">{formattedUsdcBalance}</span>
						<span className="text-muted-foreground text-xl">USDC</span>
					</div>
				</div>

				{/* Add Funds Button */}
				<Button
					className="mt-6 w-full"
					onClick={() => setIsDepositModalOpen(true)}
				>
					Add Funds
				</Button>

				{/* Network Info */}
				<p className="mt-3 text-center text-muted-foreground text-xs">
					{chainId === CHAIN_IDS.POLYGON_MAINNET
						? "Polygon Mainnet"
						: "Polygon Amoy Testnet"}
				</p>
			</div>

			<DepositModal
				onClose={() => setIsDepositModalOpen(false)}
				open={isDepositModalOpen}
			/>
		</>
	);
}
