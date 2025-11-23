"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscribe } from "@/hooks/use-subscribe";
import { orpc } from "@/utils/orpc";

export default function SubscribePage() {
	const queryClient = useQueryClient();
	const { isConnected } = useAccount();

	// Get the default agent to subscribe to
	const { data: agents } = useQuery({
		...orpc.agent.list.queryOptions({
			// Default agent should be first active agent
		}),
		enabled: isConnected,
	});

	// Get first active agent (default "AI Stylist" agent)
	const defaultAgent = agents?.agents?.[0];

	// Subscribe mutation - uses x402 for payment
	const {
		subscribe,
		isLoading: isSubscribing,
		error: subscribeError,
		data: subscribeData,
		canSubscribe,
	} = useSubscribe();

	const handleSubscribe = async () => {
		if (!defaultAgent) {
			toast.error("No agent available", {
				description: "Please try again later",
			});
			return;
		}

		try {
			await subscribe();
			toast.success("Subscription activated!");
			// Invalidate subscriptions query to refresh the list
			queryClient.invalidateQueries({
				queryKey: ["subscription", "list"],
			});
		} catch (error) {
			console.error("Subscription failed:", error);
			toast.error("Subscription failed", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

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
	if (subscribeData) {
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
								You're now subscribed to {subscribeData.agent.name}
							</p>
						</div>
						{subscribeData.payment.network && (
							<div className="rounded-lg border bg-muted/50 p-4 text-sm">
								<p className="text-muted-foreground">Payment Details:</p>
								<p className="font-mono text-xs">
									Network: {subscribeData.payment.network}
								</p>
								<p className="font-mono text-xs">
									Amount: ${(subscribeData.payment.amount / 100).toFixed(2)}
								</p>
								<p className="font-mono text-xs">
									Status: {subscribeData.payment.status}
								</p>
							</div>
						)}
						<div className="space-y-2">
							<Button asChild className="w-full" size="lg">
								<Link href="/">Go to Home</Link>
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
						<h1 className="font-bold text-3xl">
							Subscribe to {defaultAgent?.name || "AI Stylist"}
						</h1>
						<p className="text-muted-foreground">
							{defaultAgent?.description ||
								"Get personalized style advice and wardrobe management"}
						</p>
						<p className="mt-2 text-muted-foreground text-sm">
							$9.99/month • Pay with USDC on Polygon
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

					{/* Error display */}
					{subscribeError && (
						<Alert variant="destructive">
							<AlertTitle>Subscription Failed</AlertTitle>
							<AlertDescription>{subscribeError.message}</AlertDescription>
						</Alert>
					)}

					{/* Subscribe Button */}
					<Button
						className="w-full"
						disabled={isSubscribing || !canSubscribe || !defaultAgent}
						onClick={handleSubscribe}
						size="lg"
					>
						{isSubscribing ? (
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
						<p className="font-medium">
							Powered by multi-facilitator auto-routing
						</p>
					</div>
				</div>
			</Card>
		</div>
	);
}
