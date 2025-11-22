"use client";

import { UI_CONFIG } from "@ai-stilist/shared/constants";
import { SignIn } from "@coinbase/cdp-react";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { useSiweAuthentication } from "@/hooks/use-siwe-authentication";

const stepOptions = ["wallet", "otp", "complete"] as const;

type SignInFlowProps = {
	session: { user: unknown } | null;
};

type OtpStepContentProps = {
	isPending: boolean;
	isConnected: boolean;
	address: `0x${string}` | undefined;
	error: Error | null;
	authenticate: (params: { address: string; chainId: number }) => void;
	chainId: number;
};

function OtpStepContent({
	isPending,
	isConnected,
	address,
	error,
	authenticate,
	chainId,
}: OtpStepContentProps) {
	// Show pending state while authentication is in progress
	if (isPending) {
		return (
			<div className="text-center">
				<div className="mb-4 text-4xl">⏳</div>
				<p className="text-muted-foreground">
					Securely linking your wallet to your account...
				</p>
			</div>
		);
	}

	// Handle connected wallet state
	if (isConnected) {
		// Show error state with retry button
		if (error) {
			return (
				<div className="text-center">
					<p className="mb-4 text-muted-foreground">
						Failed to link your wallet. Please try again.
					</p>
					<button
						className="w-full rounded bg-primary py-2 text-primary-foreground hover:bg-primary/90"
						onClick={() => {
							if (address && isConnected) {
								authenticate({ address, chainId });
							}
						}}
						type="button"
					>
						Retry
					</button>
				</div>
			);
		}
		// Connected but no error - authentication in progress
		return null;
	}

	// Default: waiting for wallet connection
	return (
		<div className="text-center">
			<div className="mb-4 text-4xl">⏳</div>
			<p className="text-muted-foreground">Waiting for wallet connection...</p>
		</div>
	);
}

export function SignInFlow({ session }: SignInFlowProps) {
	const router = useRouter();

	const [step, setStep] = useQueryState(
		"step",
		parseAsStringLiteral(stepOptions).withDefault("wallet")
	);

	const { address, isConnected } = useAccount();
	const chainId = useChainId();

	const { authenticate, isPending, error } = useSiweAuthentication({
		onSuccess: () => {
			setStep("complete");
			setTimeout(() => router.push("/dashboard"), UI_CONFIG.REDIRECT_DELAY_MS);
		},
	});

	const handleWalletCreated = () => {
		setStep("otp");
	};

	// Smart initialization: check auth state and auto-progress
	useEffect(() => {
		// If already authenticated, redirect to dashboard
		if (session?.user) {
			router.push("/dashboard");
		}
	}, [session, router]);

	// Detect pre-existing wallet connection and auto-advance to OTP step
	// useEffect(() => {
	// 	// Skip if already authenticated
	// 	if (session?.user) {
	// 		return;
	// 	}
	//
	// 	// If wallet already connected and we're on wallet step, skip to OTP
	// 	if (isConnected && address && step === "wallet") {
	// 		setStep("otp");
	// 	}
	// }, [session, isConnected, address, step, setStep]);

	// Auto-trigger SIWE when on OTP step and wallet is connected
	useEffect(() => {
		if (isConnected && address && !isPending && !error && !session?.user) {
			authenticate({ address, chainId });
		}
	}, [
		isConnected,
		address,
		chainId,
		isPending,
		error,
		authenticate,
		session?.user,
	]);

	return (
		<div className="mx-auto max-w-md p-6">
			{step === "wallet" && (
				<div>
					{address ? (
						<div className="text-center">
							<div className="mb-4 text-4xl">⏳</div>
							<p className="text-muted-foreground">Connecting your wallet...</p>
						</div>
					) : (
						<>
							<h2 className="mb-4 font-bold text-2xl">Sign in to AI Stilist</h2>
							<p className="mb-4 text-muted-foreground">
								Create your wallet to get started. No seed phrase needed!
							</p>
							<SignIn onSuccess={handleWalletCreated} />
						</>
					)}
				</div>
			)}

			{step === "otp" && (
				<div className="text-center">
					<h2 className="mb-4 font-bold text-2xl">
						{isPending
							? "Completing Authentication..."
							: "Verifying Your Wallet"}
					</h2>

					{address && isConnected && (
						<div className="mb-4 rounded bg-muted p-4">
							<p className="text-muted-foreground text-sm">Wallet Address:</p>
							<p className="font-mono text-sm">
								{address.slice(0, UI_CONFIG.ADDRESS_PREFIX_LENGTH)}...
								{address.slice(-UI_CONFIG.ADDRESS_SUFFIX_LENGTH)}
							</p>
						</div>
					)}

					<OtpStepContent
						address={address}
						authenticate={authenticate}
						chainId={chainId}
						error={error}
						isConnected={isConnected}
						isPending={isPending}
					/>
				</div>
			)}

			{step === "complete" && (
				<div className="text-center">
					<div className="mb-4 text-6xl">✅</div>
					<h2 className="mb-2 font-bold text-2xl">You're All Set!</h2>
					<p className="mb-4 text-muted-foreground">
						Your wallet has been linked to your account.
					</p>
					<p className="text-muted-foreground text-sm">
						Redirecting to dashboard...
					</p>
				</div>
			)}

			{error && step !== "otp" && (
				<div className="mt-4 rounded border border-destructive bg-destructive/10 p-4">
					<p className="text-destructive text-sm">{error.message}</p>
				</div>
			)}
		</div>
	);
}
