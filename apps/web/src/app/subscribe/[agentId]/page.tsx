"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Loader2,
	Sparkles,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress, formatPrice } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";
import { useGaslessSubscribe } from "./_hooks/use-gasless-subscribe";
import type { AgentId } from "@ai-stilist/shared/typeid";
import { USDC_ADDRESSES } from "@ai-stilist/shared/constants";

export default function SubscribePage() {
	const params = useParams();
	const router = useRouter();
	const agentId = params.agentId as AgentId;
	const { address, isConnected } = useAccount();
	const chainId = useChainId();

	// Load agent details
	const { data: agent, isLoading: agentLoading } = useQuery(
		orpc.agent.get.queryOptions({ input: { id: agentId } })
	);

	// Check existing subscriptions
	const { data: subscriptions, isLoading: subsLoading } = useQuery({
		...orpc.subscription.list.queryOptions(),
		enabled: isConnected,
	});

	// Initiate subscription (get payment requirements)
	const {
		data: requirements,
		mutate: initiate,
		isPending: initiating,
		isSuccess: requirementsReady,
	} = useMutation({
		mutationFn: () => client.subscription.initiate({ agentId }),
	});

	// Check USDC balance
	const usdcAddress = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
	const { data: usdcBalance } = useReadContract({
		address: usdcAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: Boolean(address && usdcAddress),
		},
	});

	// Gasless subscribe hook
	const subscribe = useGaslessSubscribe({
		agentId,
		requirements: requirements!,
		userAddress: address!,
	});

	// Auto-initiate on load
	useEffect(() => {
		if (isConnected && !initiating && !requirements) {
			initiate();
		}
	}, [isConnected, initiating, requirements, initiate]);

	// Check if already subscribed
	const hasActiveSubscription = subscriptions?.subscriptions.some(
		(sub) => sub.agentId === agentId && sub.status === "active"
	);

	// Redirect if already subscribed
	useEffect(() => {
		if (hasActiveSubscription) {
			router.push("/dashboard");
		}
	}, [hasActiveSubscription, router]);

	// Loading state
	if (agentLoading || subsLoading || !agent) {
		return (
			<div className="container space-y-6 py-6">
				<Skeleton className="h-10 w-32" />
				<Card className="p-8">
					<div className="space-y-4">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-20 w-full" />
					</div>
				</Card>
			</div>
		);
	}

	// Not connected state
	if (!isConnected) {
		return (
			<div className="container space-y-6 py-6">
				<Button asChild size="sm" variant="ghost">
					<Link href={`/agents/${agentId}`}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Agent
					</Link>
				</Button>
				<Alert>
					<Wallet className="h-4 w-4" />
					<AlertTitle>Wallet not connected</AlertTitle>
					<AlertDescription>
						Please connect your wallet to subscribe to this agent.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	// Success state
	if (subscribe.isSuccess) {
		return (
			<div className="container space-y-6 py-6">
				<Card className="p-8">
					<div className="space-y-6 text-center">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<div>
							<h2 className="font-bold text-2xl">Subscription Activated!</h2>
							<p className="text-muted-foreground">
								You're now subscribed to {agent.name}
							</p>
						</div>
						<div className="space-y-2">
							<Button asChild className="w-full" size="lg">
								<Link href="/dashboard">
									Go to Dashboard
								</Link>
							</Button>
							<Button asChild variant="outline" className="w-full">
								<Link href="/agents">
									Browse More Agents
								</Link>
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	// Calculate balance status
	const priceUsd = requirements?.price.replace("$", "") || "0";
	const priceInMicroUsdc = BigInt(Number.parseFloat(priceUsd) * 1_000_000);
	const hasEnoughBalance = usdcBalance ? usdcBalance >= priceInMicroUsdc : false;
	const usdcBalanceFormatted = usdcBalance
		? Number.parseFloat(formatUnits(usdcBalance, 6)).toFixed(2)
		: "0.00";

	return (
		<div className="container space-y-6 py-6 pb-24 md:pb-6">
			{/* Back Button */}
			<Button asChild size="sm" variant="ghost">
				<Link href={`/agents/${agentId}`}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Agent
				</Link>
			</Button>

			{/* Subscribe Card */}
			<Card className="p-8">
				<div className="space-y-6">
					{/* Header */}
					<div className="text-center">
						<h1 className="font-bold text-3xl">Subscribe to {agent.name}</h1>
						<p className="text-muted-foreground">
							Pay once for 30 days of access
						</p>
					</div>

					{/* Progress */}
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span
								className={
									requirementsReady
										? "text-green-600 font-medium"
										: "text-muted-foreground"
								}
							>
								1. Prepare Payment
							</span>
							<span className="text-muted-foreground">2. Authorize</span>
							<span className="text-muted-foreground">3. Complete</span>
						</div>
						<Progress
							value={requirementsReady ? (subscribe.isPending ? 66 : 33) : 0}
						/>
					</div>

					{/* Payment Summary */}
					{requirementsReady && requirements && (
						<div className="space-y-4 rounded-lg border bg-muted/50 p-4">
							<h3 className="font-semibold">Payment Summary</h3>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Amount</span>
									<span className="font-semibold">{requirements.price} USDC</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Recipient</span>
									<code className="font-mono text-xs">
										{formatAddress(requirements.recipient)}
									</code>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Network</span>
									<Badge variant="outline">
										{requirements.network === "polygon-amoy"
											? "Polygon Amoy"
											: "Polygon"}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Gas Fees</span>
									<span className="font-semibold text-green-600">$0.00</span>
								</div>
							</div>
						</div>
					)}

					{/* Balance Check */}
					{requirementsReady && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">
									Your USDC Balance
								</span>
								<span className="font-semibold">${usdcBalanceFormatted}</span>
							</div>
							{!hasEnoughBalance && (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>Insufficient Balance</AlertTitle>
									<AlertDescription>
										You need ${priceUsd} USDC to subscribe. Please add funds to
										your wallet.
									</AlertDescription>
								</Alert>
							)}
						</div>
					)}

					{/* Subscribe Button */}
					<Button
						className="w-full"
						disabled={
							!requirementsReady || subscribe.isPending || !hasEnoughBalance
						}
						size="lg"
						onClick={() => subscribe.mutate()}
					>
						{subscribe.isPending ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-5 w-5" />
								Authorize Payment
							</>
						)}
					</Button>

					{/* Info */}
					<p className="text-center text-muted-foreground text-xs">
						You'll be prompted to sign a message in your wallet. This is free
						and doesn't send a transaction.
					</p>
				</div>
			</Card>
		</div>
	);
}
