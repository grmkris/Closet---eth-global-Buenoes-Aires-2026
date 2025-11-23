"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Calendar, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import { client } from "@/utils/orpc";
import type { Subscription } from "@/utils/orpc-types";

type SubscriptionCardProps = {
	subscription: Subscription & { agent: { name: string; specialty: string } };
};

const SPECIALTY_COLORS: Record<
	string,
	{ bg: string; text: string; icon: string }
> = {
	minimalist: { bg: "bg-slate-100", text: "text-slate-700", icon: "⚪" },
	vintage: { bg: "bg-amber-100", text: "text-amber-700", icon: "🕰️" },
	streetwear: { bg: "bg-purple-100", text: "text-purple-700", icon: "🎨" },
	luxury: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "💎" },
	sustainable: { bg: "bg-green-100", text: "text-green-700", icon: "🌱" },
};

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const queryClient = useQueryClient();

	const cancelMutation = useMutation({
		mutationFn: () => client.subscription.cancel({ id: subscription.id }),
		onError: (error) => {
			toast.error("Failed to cancel subscription", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
		onSuccess: () => {
			toast.success("Subscription cancelled", {
				description: "You can resubscribe anytime",
			});
			setCancelDialogOpen(false);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["subscription", "list"],
			});
		},
	});

	const specialtyConfig =
		SPECIALTY_COLORS[subscription.agent.specialty] ||
		SPECIALTY_COLORS.minimalist;

	const isActive = subscription.status === "active";
	const isCancelled = subscription.status === "cancelled";

	let badgeColor = "bg-yellow-500";
	if (isActive) {
		badgeColor = "bg-green-500";
	} else if (isCancelled) {
		badgeColor = "bg-gray-400";
	}

	return (
		<>
			<Card className="overflow-hidden transition-all hover:shadow-md">
				<div className="space-y-4 p-6">
					{/* Header */}
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<h3 className="truncate font-semibold text-lg">
								{subscription.agent.name}
							</h3>
							<Badge
								className={`mt-1 gap-1 ${specialtyConfig.bg} ${specialtyConfig.text}`}
								variant="secondary"
							>
								<span>{specialtyConfig.icon}</span>
								<span className="capitalize">
									{subscription.agent.specialty}
								</span>
							</Badge>
						</div>
						<Badge
							className={badgeColor}
							variant={isActive ? "default" : "secondary"}
						>
							{subscription.status === "active" && (
								<BadgeCheck className="mr-1 h-3 w-3" />
							)}
							{subscription.status === "cancelled" && (
								<XCircle className="mr-1 h-3 w-3" />
							)}
							<span className="capitalize">{subscription.status}</span>
						</Badge>
					</div>

					{/* Details */}
					<div className="space-y-2 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Price</span>
							<span className="font-semibold">
								{formatPrice(subscription.priceMonthly)}/month
							</span>
						</div>
						{isActive && subscription.nextPaymentDue && (
							<div className="flex items-center justify-between">
								<span className="flex items-center gap-1 text-muted-foreground">
									<Calendar className="h-3 w-3" />
									Next Payment
								</span>
								<span className="font-medium">
									{formatRelativeDate(new Date(subscription.nextPaymentDue))}
								</span>
							</div>
						)}
						{isCancelled && subscription.cancelledAt && (
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Cancelled</span>
								<span className="text-sm">
									{new Date(subscription.cancelledAt).toLocaleDateString()}
								</span>
							</div>
						)}
					</div>

					{/* Actions */}
					{isActive && (
						<Button
							className="w-full"
							onClick={() => setCancelDialogOpen(true)}
							size="sm"
							variant="outline"
						>
							<XCircle className="mr-2 h-4 w-4" />
							Cancel Subscription
						</Button>
					)}
				</div>
			</Card>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog onOpenChange={setCancelDialogOpen} open={cancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel your subscription to{" "}
							<strong>{subscription.agent.name}</strong>?
							<br />
							<br />
							You'll lose access at the end of your current billing period (
							{subscription.nextPaymentDue &&
								new Date(subscription.nextPaymentDue).toLocaleDateString()}
							).
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Subscription</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={cancelMutation.isPending}
							onClick={() => cancelMutation.mutate()}
						>
							{cancelMutation.isPending
								? "Cancelling..."
								: "Cancel Subscription"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function SubscriptionCardSkeleton() {
	return (
		<Card className="overflow-hidden">
			<div className="space-y-4 p-6">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-5 w-24" />
					</div>
					<Skeleton className="h-5 w-16" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
				</div>
				<Skeleton className="h-9 w-full" />
			</div>
		</Card>
	);
}
