"use client";

import {
	CHAIN_IDS,
	USDC_ADDRESSES,
	WALLET_UI_CONFIG,
} from "@ai-stilist/shared/constants";
import { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
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
	} = useBalance({
		address,
		token: USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES],
		chainId,
		query: {
			enabled: !!address && isConnected,
		},
	});

	// Get native POL balance (for gas)
	const { data: polBalance, isLoading: isLoadingPol } = useBalance({
		address,
		chainId,
		query: {
			enabled: !!address && isConnected,
		},
	});

	if (!isConnected) {
		return (
			<div className="rounded-lg border p-6">
				<h3 className="font-semibold text-lg">Wallet Balance</h3>
				<p className="mt-4 text-gray-500">
					Connect your wallet to view balance
				</p>
			</div>
		);
	}

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
						{isLoadingUsdc ? "Refreshing..." : "Refresh"}
					</Button>
				</div>

				{/* USDC Balance */}
				<div className="mt-4">
					<p className="text-gray-600 text-sm">USDC Balance</p>
					<p className="font-bold text-3xl">
						{(() => {
							if (isLoadingUsdc) {
								return "...";
							}
							if (usdcBalance) {
								return Number.parseFloat(usdcBalance.formatted).toFixed(
									WALLET_UI_CONFIG.USDC_DECIMALS
								);
							}
							return "0.00";
						})()}
						<span className="ml-2 text-gray-500 text-lg">USDC</span>
					</p>
				</div>

				{/* POL Balance (for gas) */}
				<div className="mt-3">
					<p className="text-gray-500 text-xs">
						{isLoadingPol
							? "Loading gas balance..."
							: `${Number.parseFloat(polBalance?.formatted || "0").toFixed(WALLET_UI_CONFIG.POL_DECIMALS)} POL (for gas)`}
					</p>
				</div>

				{/* Add Funds Button */}
				<Button
					className="mt-4 w-full"
					onClick={() => setIsDepositModalOpen(true)}
				>
					Add Funds
				</Button>

				{/* Network Info */}
				<p className="mt-3 text-center text-gray-400 text-xs">
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
