"use client";

import { UI_CONFIG } from "@ai-stilist/shared/constants";
import { SignIn } from "@coinbase/cdp-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useSiweAuthentication } from "@/hooks/use-siwe-authentication";
import { authClient } from "@/lib/auth-client";

type Step = "wallet" | "otp" | "complete";

type OtpStepContentProps = {
	isPending: boolean;
	isConnected: boolean;
	address: `0x${string}` | undefined;
	error: Error | null;
	authenticate: (params: { address: string; chainId: number }) => void;
	hasAutoSiwedRef: React.MutableRefObject<boolean>;
};

function OtpStepContent({
	isPending,
	isConnected,
	address,
	error,
	authenticate,
	hasAutoSiwedRef,
}: OtpStepContentProps) {
	// Show pending state while authentication is in progress
	if (isPending) {
		return (
			<div className="text-center">
				<div className="mb-4 text-4xl">⏳</div>
				<p className="text-gray-600">
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
					<p className="mb-4 text-gray-600">
						Failed to link your wallet. Please try again.
					</p>
					<button
						className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
						onClick={() => {
							if (address && isConnected) {
								hasAutoSiwedRef.current = false;
								authenticate({ address, chainId: 8453 });
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
			<p className="text-gray-600">Waiting for wallet connection...</p>
		</div>
	);
}

export function SignInFlow() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const urlStep = (searchParams.get("step") as Step) || "wallet";

	const [step, setStep] = useState<Step>(urlStep);
	const [isInitializing, setIsInitializing] = useState(true);

	const { address, isConnected } = useAccount();
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	const hasAutoSiwedRef = useRef(false);

	// Sync URL changes to component state
	useEffect(() => {
		const newUrlStep = (searchParams.get("step") as Step) || "wallet";
		if (newUrlStep !== step) {
			setStep(newUrlStep);
		}
	}, [searchParams, step]);

	// Update step and URL together
	const updateStep = (newStep: Step) => {
		setStep(newStep);
		if (newStep === "wallet") {
			router.replace("/login");
		} else {
			router.replace(`/login?step=${newStep}`);
		}
	};

	const { authenticate, isPending, error } = useSiweAuthentication({
		onSuccess: () => {
			updateStep("complete");
			setTimeout(() => router.push("/dashboard"), UI_CONFIG.REDIRECT_DELAY_MS);
		},
	});

	const handleWalletCreated = () => {
		updateStep("otp");
	};

	// Smart initialization: check auth state and auto-progress
	useEffect(() => {
		// Wait for session check to complete
		if (isSessionLoading) {
			return;
		}

		// If already authenticated, redirect to dashboard
		if (session?.user) {
			router.push("/dashboard");
			return;
		}

		setIsInitializing(false);
	}, [session, isSessionLoading, router]);

	// Auto-trigger SIWE when on OTP step and wallet is connected
	useEffect(() => {
		if (step === "otp" && isConnected && address && !hasAutoSiwedRef.current) {
			hasAutoSiwedRef.current = true;
			// Automatically trigger SIWE flow
			authenticate({ address, chainId: 8453 });
		}
	}, [step, isConnected, address, authenticate]);

	// Show loading state while checking authentication
	if (isInitializing || isSessionLoading) {
		return (
			<div className="mx-auto max-w-md p-6 text-center">
				<div className="mb-4 text-4xl">⏳</div>
				<p className="text-gray-600">Checking authentication...</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-md p-6">
			{step === "wallet" && (
				<div>
					{isPending ? (
						<div className="text-center">
							<div className="mb-4 text-4xl">⏳</div>
							<p className="text-gray-600">Connecting your wallet...</p>
						</div>
					) : (
						<>
							<h2 className="mb-4 font-bold text-2xl">Sign in to AI Stilist</h2>
							<p className="mb-4 text-gray-600">
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
						<div className="mb-4 rounded bg-gray-100 p-4">
							<p className="text-gray-600 text-sm">Wallet Address:</p>
							<p className="font-mono text-sm">
								{address.slice(0, UI_CONFIG.ADDRESS_PREFIX_LENGTH)}...
								{address.slice(-UI_CONFIG.ADDRESS_SUFFIX_LENGTH)}
							</p>
						</div>
					)}

					<OtpStepContent
						address={address}
						authenticate={authenticate}
						error={error}
						hasAutoSiwedRef={hasAutoSiwedRef}
						isConnected={isConnected}
						isPending={isPending}
					/>
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

			{error && step !== "otp" && (
				<div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
					<p className="text-red-600 text-sm">{error.message}</p>
				</div>
			)}
		</div>
	);
}
