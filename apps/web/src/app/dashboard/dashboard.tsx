"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import {
	SubscriptionCard,
	SubscriptionCardSkeleton,
} from "@/components/subscriptions/subscription-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletBalanceCard } from "@/components/wallet/balance-card";
import type { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	// Fetch wardrobe stats to show processing queue
	const { data: stats, isLoading } = useQuery(
		orpc.wardrobe.getTags.queryOptions({
			refetchInterval: (query) => {
				// Poll if there might be processing items
				return query.state.data ? POLLING_CONFIG.PROCESSING_INTERVAL_MS : false;
			},
		})
	);

	// Fetch user subscriptions
	const { data: subscriptionsData, isLoading: subsLoading } = useQuery(
		orpc.subscription.list.queryOptions()
	);

	const processingCount = 0; // We could track this in getTags if needed
	const activeSubscriptions =
		subscriptionsData?.subscriptions.filter((sub) => sub.status === "active") ||
		[];

	if (isLoading) {
		return (
			<div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24 sm:px-6 md:space-y-6 md:py-8 md:pb-8">
				{/* Welcome Header Skeleton */}
				<div className="space-y-2 text-center">
					<Skeleton className="mx-auto h-8 w-64 sm:h-10 md:h-12" />
					<Skeleton className="mx-auto h-4 w-48 sm:h-5" />
				</div>

				{/* Stats Skeleton */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
					<Skeleton className="h-20 sm:h-24" />
					<Skeleton className="h-20 sm:h-24" />
					<Skeleton className="col-span-2 h-20 sm:col-span-1 sm:h-24" />
				</div>

				{/* Buttons Skeleton */}
				<div className="space-y-2 sm:space-y-3">
					<Skeleton className="h-12 w-full sm:h-14 md:h-16" />
					<Skeleton className="h-12 w-full sm:h-14 md:h-16" />
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24 sm:px-6 md:space-y-6 md:py-8 md:pb-8">
			{/* Welcome Header */}
			<div className="text-center">
				<h1 className="font-bold text-2xl sm:text-3xl md:text-4xl">
					Welcome back{session.user.name ? `, ${session.user.name}` : ""}!
				</h1>
				<p className="mt-2 text-muted-foreground text-sm sm:text-base">
					Your AI-powered wardrobe assistant
				</p>
			</div>

			{/* Processing Status (if active) */}
			{processingCount > 0 && (
				<Card className="bg-primary/10 p-4">
					<div className="flex items-center gap-3">
						<Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
						<div className="flex-1">
							<p className="font-medium text-sm">
								{processingCount} {processingCount > 1 ? "items" : "item"}{" "}
								processing
							</p>
							<p className="text-muted-foreground text-xs">
								Your photos are being analyzed with AI
							</p>
						</div>
					</div>
				</Card>
			)}

			{/* Wallet Balance and Quick Stats */}
			<div className="grid gap-3 md:grid-cols-2 md:gap-4">
				{/* Wallet Balance Card */}
				<WalletBalanceCard />

				{/* Quick Stats */}
				{stats && stats.totalItems > 0 && (
					<div className="grid grid-cols-2 gap-3 md:gap-4">
						<Card className="p-3 text-center sm:p-4">
							<p className="text-muted-foreground text-xs sm:text-sm">
								Total Items
							</p>
							<p className="mt-1 font-bold text-xl sm:text-2xl">
								{stats.totalItems}
							</p>
						</Card>
						<Card className="p-3 text-center sm:p-4">
							<p className="text-muted-foreground text-xs sm:text-sm">
								Categories
							</p>
							<p className="mt-1 font-bold text-xl sm:text-2xl">
								{stats.categories.length}
							</p>
						</Card>
					</div>
				)}
			</div>

			{/* Subscriptions Section */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-lg">My Subscriptions</h2>
					<Button asChild size="sm" variant="ghost">
						<Link href="/subscribe">Subscribe</Link>
					</Button>
				</div>

				{subsLoading ? (
					<div className="grid gap-3 sm:grid-cols-2">
						<SubscriptionCardSkeleton />
						<SubscriptionCardSkeleton />
					</div>
				) : activeSubscriptions.length > 0 ? (
					<div className="grid gap-3 sm:grid-cols-2">
						{activeSubscriptions.slice(0, 4).map((subscription) => (
							<SubscriptionCard key={subscription.id} subscription={subscription} />
						))}
					</div>
				) : (
					<Alert>
						<Sparkles className="h-4 w-4" />
						<AlertTitle>No active subscriptions</AlertTitle>
						<AlertDescription>
							Subscribe to AI Stylist to get personalized fashion advice.
						</AlertDescription>
					</Alert>
				)}
			</div>

			{/* Primary Actions */}
			<div className="space-y-2 sm:space-y-3">
				<Link className="block" href={"/wardrobe"}>
					<Button className="h-12 w-full sm:h-14 md:h-16" size="lg">
						<Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
						<span className="text-sm sm:text-base md:text-lg">
							Browse Wardrobe
						</span>
					</Button>
				</Link>
				<Link className="block" href={"/wardrobe"}>
					<Button
						className="h-12 w-full sm:h-14 md:h-16"
						size="lg"
						variant="outline"
					>
						<Camera className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
						<span className="text-sm sm:text-base md:text-lg">
							Upload Photos
						</span>
					</Button>
				</Link>
			</div>

			{/* Empty State */}
			{stats && stats.totalItems === 0 && (
				<Card className="p-6 text-center sm:p-8">
					<div className="mx-auto max-w-md space-y-3 sm:space-y-4">
						<div className="flex justify-center">
							<div className="rounded-full bg-muted p-3 sm:p-4">
								<Camera className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
							</div>
						</div>
						<div>
							<h2 className="font-semibold text-base sm:text-lg">
								Start Your Wardrobe
							</h2>
							<p className="mt-1 text-muted-foreground text-xs sm:text-sm">
								Upload photos of your clothing to get AI-powered organization,
								tags, and styling suggestions
							</p>
						</div>
					</div>
				</Card>
			)}
		</div>
	);
}
