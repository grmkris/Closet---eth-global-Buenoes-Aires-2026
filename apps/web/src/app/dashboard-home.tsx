"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionCardsGrid } from "@/components/home/action-cards-grid";
import { UploadModal } from "@/components/wardrobe/upload-modal";
import { OutfitSuggestionCard } from "@/components/home/outfit-suggestion-card";
import {
	SubscriptionCard,
	SubscriptionCardSkeleton,
} from "@/components/subscriptions/subscription-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
			<div className="mx-auto max-w-2xl space-y-5 px-4 py-3 pb-24 sm:px-6 md:pb-8">
				{/* Greeting Skeleton */}
				<div className="space-y-1">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-48" />
				</div>

				{/* Hero Skeleton */}
				<Skeleton className="h-64 w-full" />

				{/* Action Cards Skeleton */}
				<div className="grid grid-cols-2 gap-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	// Mock outfit data - replace with real API call
	const todayOutfit = undefined; // TODO: Fetch from API

	return (
		<div className="mx-auto max-w-2xl space-y-5 px-4 py-3 pb-24 sm:px-6 md:pb-8">
			{/* Compact Greeting + Stats */}
			<div>
				<p className="text-muted-foreground text-sm">
					Welcome back{session.user.name ? `, ${session.user.name}` : ""}
				</p>
				{stats && stats.totalItems > 0 && (
					<p className="mt-1 text-muted-foreground text-xs">
						{stats.totalItems} items • {stats.categories.length} categories
					</p>
				)}
			</div>

			{/* Processing Status (if active) */}
			{processingCount > 0 && (
				<Card className="flex items-center gap-3 border-l-4 border-l-primary p-3">
					<Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
					<p className="text-sm">
						{processingCount} {processingCount > 1 ? "items" : "item"}{" "}
						processing
					</p>
				</Card>
			)}

			{/* Hero: Daily Outfit Suggestion */}
			<OutfitSuggestionCard outfit={todayOutfit} />

			{/* Quick Action Cards */}
			<ActionCardsGrid onUploadClick={() => setUploadModalOpen(true)} />

			{/* Subscriptions - Horizontal Scroll */}
			{!subsLoading && activeSubscriptions.length > 0 && (
				<div>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="font-semibold text-lg">My Subscriptions</h2>
						<Button asChild size="sm" variant="ghost">
							<Link href="/subscribe">View all</Link>
						</Button>
					</div>
					<div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
						{activeSubscriptions.map((subscription) => (
							<div
								className="w-64 flex-shrink-0 snap-start"
								key={subscription.id}
							>
								<SubscriptionCard subscription={subscription} />
							</div>
						))}
					</div>
				</div>
			)}

			{subsLoading && (
				<div className="flex gap-3 overflow-x-auto">
					<div className="w-64 flex-shrink-0">
						<SubscriptionCardSkeleton />
					</div>
					<div className="w-64 flex-shrink-0">
						<SubscriptionCardSkeleton />
					</div>
				</div>
			)}

			{/* Subscription Prompt (if no active subs) */}
			{!subsLoading && activeSubscriptions.length === 0 && (
				<Card className="border-dashed p-6 text-center">
					<p className="mb-2 font-medium text-sm">Get personalized styling</p>
					<p className="mb-4 text-muted-foreground text-xs">
						Subscribe to unlock AI-powered outfit suggestions and style advice
					</p>
					<Button asChild size="sm">
						<Link href="/subscribe">Explore Plans</Link>
					</Button>
				</Card>
			)}

			{/* Upload Modal */}
			<UploadModal onOpenChange={setUploadModalOpen} open={uploadModalOpen} />
		</div>
	);
}
