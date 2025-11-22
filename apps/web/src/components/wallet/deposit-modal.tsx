"use client";

import { WALLET_UI_CONFIG } from "@ai-stilist/shared/constants";
import { Copy } from "lucide-react";
import { useState } from "react";
import QRCodeSVG from "react-qr-code";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type DepositModalProps = {
	open: boolean;
	onClose: () => void;
};

export function DepositModal({ open, onClose }: DepositModalProps) {
	const { address } = useAccount();
	const [copied, setCopied] = useState(false);

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

	if (!address) {
		return null;
	}

	return (
		<Dialog onOpenChange={onClose} open={open}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Add Funds to Your Wallet</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Manual Deposit Section */}
					<div className="rounded-lg border p-4">
						<h3 className="font-semibold">Transfer USDC</h3>
						<p className="mt-2 text-muted-foreground text-sm">
							Send USDC on Polygon network to your wallet address:
						</p>

						{/* Wallet Address */}
						<div className="mt-3 flex items-center gap-2 rounded bg-muted p-3">
							<code className="flex-1 break-all font-mono text-xs">
								{address}
							</code>
							<Button
								className="shrink-0"
								onClick={copyAddress}
								size="sm"
								variant="ghost"
							>
								<Copy className="h-4 w-4" />
								{copied && <span className="ml-1 text-xs">Copied!</span>}
							</Button>
						</div>

						{/* QR Code */}
						<div className="mt-4 flex justify-center rounded bg-card p-4 dark:invert">
							<QRCodeSVG size={180} value={address} />
						</div>

						{/* Warning */}
						<div className="mt-3 rounded border border-accent bg-accent/10 p-3">
							<p className="text-accent-foreground text-xs">
								⚠️ Only send USDC on Polygon network to this address. Sending
								other tokens or using a different network may result in loss of
								funds.
							</p>
						</div>
					</div>

					{/* Instructions */}
					<div className="rounded-lg bg-muted p-4">
						<h4 className="font-semibold text-sm">How to get testnet USDC:</h4>
						<ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground text-xs">
							<li>Get POL tokens from Polygon Amoy faucet</li>
							<li>Swap POL to USDC on a testnet DEX</li>
							<li>Or ask in Discord for testnet USDC</li>
						</ol>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
