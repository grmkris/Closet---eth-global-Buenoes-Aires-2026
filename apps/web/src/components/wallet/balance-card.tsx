"use client";

import { CHAIN_IDS } from "@ai-stilist/shared/constants";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { DepositModal } from "./deposit-modal";

export function WalletBalanceCard() {
	const { isConnected } = useAccount();
	const chainId = useChainId();
	const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

	// Get native POL balance (for gas)
	//	const { data: polBalance, isLoading: isLoadingPol } = useBalance({
	//		address,
	//		chainId,
	//		query: {
	//			enabled: !!address && isConnected,
	//		},
	//	});

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

	return (
		<>
			<div className="rounded-lg border p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-lg">Wallet Balance</h3>
				</div>

				{/* Add Funds Button */}
				<Button
					className="mt-4 w-full"
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
