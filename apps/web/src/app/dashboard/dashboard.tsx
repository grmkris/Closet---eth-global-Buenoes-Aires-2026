"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	// Fetch wardrobe stats to show processing queue
	const { data: stats } = useQuery(
		orpc.wardrobe.getTags.queryOptions({
			refetchInterval: (query) => {
				// Poll if there might be processing items
				return query.state.data ? POLLING_CONFIG.PROCESSING_INTERVAL_MS : false;
			},
		})
	);

	const processingCount = 0; // We could track this in getTags if needed

	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
			{/* Welcome Header */}
			<div className="text-center">
				<h1 className="font-bold text-3xl sm:text-4xl">
					Welcome back{session.user.name ? `, ${session.user.name}` : ""}!
				</h1>
				<p className="mt-2 text-muted-foreground">
					Your AI-powered wardrobe assistant
				</p>
			</div>

			{/* Processing Status (if active) */}
			{processingCount > 0 && (
				<Card className="bg-blue-50 p-4 dark:bg-blue-950/20">
					<div className="flex items-center gap-3">
						<Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
						<div className="flex-1">
							<p className="font-medium text-blue-900 text-sm dark:text-blue-100">
								{processingCount} {processingCount > 1 ? "items" : "item"}{" "}
								processing
							</p>
							<p className="text-blue-700 text-xs dark:text-blue-300">
								Your photos are being analyzed with AI
							</p>
						</div>
					</div>
				</Card>
			)}

			{/* Quick Stats */}
			{stats && stats.totalItems > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<Card className="p-4 text-center">
						<p className="text-muted-foreground text-sm">Total Items</p>
						<p className="mt-1 font-bold text-2xl">{stats.totalItems}</p>
					</Card>
					<Card className="p-4 text-center">
						<p className="text-muted-foreground text-sm">Categories</p>
						<p className="mt-1 font-bold text-2xl">{stats.categories.length}</p>
					</Card>
					<Card className="col-span-2 p-4 text-center sm:col-span-1">
						<p className="text-muted-foreground text-sm">Tags</p>
						<p className="mt-1 font-bold text-2xl">{stats.totalTags}</p>
					</Card>
				</div>
			)}

			{/* Primary Actions */}
			<div className="space-y-3">
				<Link className="block" href="/wardrobe">
					<Button
						className="h-14 w-full text-base sm:h-16 sm:text-lg"
						size="lg"
					>
						<Sparkles className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
						Browse Wardrobe
					</Button>
				</Link>
				<Link className="block" href="/wardrobe">
					<Button
						className="h-14 w-full text-base sm:h-16 sm:text-lg"
						size="lg"
						variant="outline"
					>
						<Camera className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
						Upload Photos
					</Button>
				</Link>
			</div>

			{/* Empty State */}
			{stats && stats.totalItems === 0 && (
				<Card className="p-8 text-center">
					<div className="mx-auto max-w-md space-y-4">
						<div className="flex justify-center">
							<div className="rounded-full bg-muted p-4">
								<Camera className="h-12 w-12 text-muted-foreground" />
							</div>
						</div>
						<div>
							<h2 className="font-semibold text-lg">Start Your Wardrobe</h2>
							<p className="mt-1 text-muted-foreground text-sm">
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
