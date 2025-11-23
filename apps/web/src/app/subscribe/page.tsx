"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { callX402Endpoint } from "@/lib/x402-client";
import { orpc } from "@/utils/orpc";

export default function SubscribePage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { isConnected } = useAccount();

	// Check existing subscriptions
	const { data: subscriptions, isLoading: subsLoading } = useQuery({
		...orpc.subscription.list.queryOptions(),
		enabled: isConnected,
	});

	// Subscribe mutation - uses x402 for payment
	const subscribe = useMutation({
		mutationFn: async () => {
			// Call backend subscription endpoint
			// Backend will return 402 Payment Required with x402 headers
			// x402-fetch will automatically handle payment and retry
			const result = await callX402Endpoint("/rpc/subscription.subscribe", {
				method: "POST",
				credentials: "include", // Include auth cookies
			});

			return result;
		},
		onSuccess: () => {
			toast.success("Subscription activated!");
			// Invalidate subscriptions query to refresh the list
			queryClient.invalidateQueries({
				queryKey: ["subscription", "list"],
			});
		},
		onError: (error) => {
			console.error("Subscription failed:", error);
			toast.error("Subscription failed", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// Check if already subscribed
	const hasActiveSubscription = subscriptions?.subscriptions.some(
		(sub) => sub.status === "active"
	);

	// Redirect if already subscribed
	useEffect(() => {
		if (hasActiveSubscription) {
			router.push("/dashboard");
		}
	}, [hasActiveSubscription, router]);

	// Loading state
	if (subsLoading) {
		return (
			<div className="container space-y-6 py-6">
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
				<Alert>
					<Wallet className="h-4 w-4" />
					<AlertTitle>Wallet not connected</AlertTitle>
					<AlertDescription>
						Please connect your wallet to subscribe to AI Stylist.
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
								You're now subscribed to AI Stylist
							</p>
						</div>
						<div className="space-y-2">
							<Button asChild className="w-full" size="lg">
								<Link href="/dashboard">Go to Dashboard</Link>
							</Button>
							<Button asChild className="w-full" variant="outline">
								<Link href="/chat">Start Chatting</Link>
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="container space-y-6 py-6 pb-24 md:pb-6">
			{/* Subscribe Card */}
			<Card className="p-8">
				<div className="space-y-6">
					{/* Header */}
					<div className="text-center">
						<h1 className="font-bold text-3xl">Subscribe to AI Stylist</h1>
						<p className="text-muted-foreground">
							Get personalized style advice and wardrobe management
						</p>
						<p className="mt-2 text-muted-foreground text-sm">
							$9.99/month • Pay with USDC • Gasless transactions
						</p>
					</div>

					{/* Features */}
					<div className="space-y-3 rounded-lg border bg-muted/50 p-4">
						<h3 className="font-semibold">What's included:</h3>
						<ul className="space-y-2 text-sm">
							<li className="flex items-start">
								<span className="mr-2">✓</span>
								<span>AI-powered outfit recommendations</span>
							</li>
							<li className="flex items-start">
								<span className="mr-2">✓</span>
								<span>Smart wardrobe organization</span>
							</li>
							<li className="flex items-start">
								<span className="mr-2">✓</span>
								<span>Personalized style advice</span>
							</li>
							<li className="flex items-start">
								<span className="mr-2">✓</span>
								<span>Automated clothing analysis</span>
							</li>
						</ul>
					</div>

					{/* Subscribe Button */}
					<Button
						className="w-full"
						disabled={subscribe.isPending}
						onClick={() => subscribe.mutate()}
						size="lg"
					>
						{subscribe.isPending ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Processing Payment...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-5 w-5" />
								Subscribe Now
							</>
						)}
					</Button>

					{/* Info */}
					<div className="space-y-2 text-center text-muted-foreground text-xs">
						<p>Payment processed securely via x402 protocol</p>
						<p>You'll be prompted to authorize payment in your wallet</p>
						<p className="font-medium text-green-600">No gas fees required</p>
					</div>
				</div>
			</Card>
		</div>
	);
}
