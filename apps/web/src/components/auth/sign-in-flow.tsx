"use client";

import { UI_CONFIG } from "@ai-stilist/shared/constants";
import { SignIn } from "@coinbase/cdp-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";
import { authClient } from "@/lib/auth-client";

type Step = "wallet" | "siwe" | "complete";

export function SignInFlow() {
	const router = useRouter();
	const [step, setStep] = useState<Step>("wallet");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { address, isConnected } = useAccount();
	const { signMessageAsync } = useSignMessage();

	const handleWalletCreated = () => {
		setStep("siwe");
	};

	const handleSiweLink = async () => {
		if (!(address && isConnected)) {
			setError("Wallet not connected");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const { data: nonceData, error: nonceError } =
				await authClient.siwe.nonce({
					walletAddress: address,
					chainId: 8453,
				});

			if (nonceError || !nonceData?.nonce) {
				setError("Failed to get nonce");
				return;
			}

			const siweMessage = new SiweMessage({
				domain: window.location.host,
				address,
				statement: "Sign in to AI Stilist with your wallet",
				uri: window.location.origin,
				version: "1",
				chainId: 8453,
				nonce: nonceData.nonce,
			});

			const messageString = siweMessage.prepareMessage();
			const signature = await signMessageAsync({ message: messageString });

			const { data: verifyData, error: verifyError } =
				await authClient.siwe.verify({
					message: messageString,
					signature,
					walletAddress: address,
					chainId: 8453,
				});

			if (verifyError) {
				setError(verifyError.message || "SIWE verification failed");
				return;
			}

			if (verifyData) {
				setStep("complete");
				setTimeout(
					() => router.push("/dashboard"),
					UI_CONFIG.REDIRECT_DELAY_MS
				);
			}
		} catch (_err) {
			setError("Failed to link wallet");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-md p-6">
			{step === "wallet" && (
				<div>
					<h2 className="mb-4 font-bold text-2xl">Sign in to AI Stilist</h2>
					<p className="mb-4 text-gray-600">
						Create your wallet to get started. No seed phrase needed!
					</p>
					<SignIn onSuccess={handleWalletCreated} />
				</div>
			)}

			{step === "siwe" && isConnected && (
				<div>
					<h2 className="mb-4 font-bold text-2xl">Link Your Wallet</h2>
					<div className="mb-4 rounded bg-gray-100 p-4">
						<p className="text-gray-600 text-sm">Wallet Address:</p>
						<p className="font-mono text-sm">
							{address?.slice(0, UI_CONFIG.ADDRESS_PREFIX_LENGTH)}...
							{address?.slice(-UI_CONFIG.ADDRESS_SUFFIX_LENGTH)}
						</p>
					</div>
					<p className="mb-4 text-gray-600">
						Sign a message to securely link your wallet to your account.
					</p>
					<button
						className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
						disabled={isLoading}
						onClick={handleSiweLink}
						type="button"
					>
						{isLoading ? "Signing..." : "Sign & Link Wallet"}
					</button>
				</div>
			)}

			{step === "complete" && (
				<div className="text-center">
					<div className="mb-4 text-6xl">✅</div>
					<h2 className="mb-2 font-bold text-2xl">You're All Set!</h2>
					<p className="mb-4 text-gray-600">
						Your wallet has been linked to your account.
					</p>
					<p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
				</div>
			)}

			{error && (
				<div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}
		</div>
	);
}
