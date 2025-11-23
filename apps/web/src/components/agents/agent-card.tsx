"use client";

import { BadgeCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import type { Agent } from "@/utils/orpc-types";

type AgentCardProps = {
	agent: Agent;
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

export function AgentCard({ agent }: AgentCardProps) {
	const specialtyConfig =
		SPECIALTY_COLORS[agent.specialty] || SPECIALTY_COLORS.minimalist;

	return (
		<Card className="group overflow-hidden transition-all hover:shadow-lg">
			<div className="space-y-4 p-6">
				{/* Header with specialty badge */}
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<h3 className="truncate font-semibold text-lg">{agent.name}</h3>
							{agent.verified && (
								<BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />
							)}
						</div>
					</div>
					<Badge
						className={`shrink-0 gap-1 ${specialtyConfig.bg} ${specialtyConfig.text}`}
						variant="secondary"
					>
						<span>{specialtyConfig.icon}</span>
						<span className="capitalize">{agent.specialty}</span>
					</Badge>
				</div>

				{/* Description */}
				<p className="line-clamp-3 text-muted-foreground text-sm">
					{agent.description}
				</p>

				{/* Footer with price and action */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-baseline gap-1">
						<span className="font-semibold text-2xl">
							{formatPrice(agent.priceMonthly)}
						</span>
						<span className="text-muted-foreground text-sm">/month</span>
					</div>
					<Button asChild size="sm" variant="default">
						<Link href={`/agents/${agent.id}`}>
							<Sparkles className="mr-1.5 h-4 w-4" />
							View Details
						</Link>
					</Button>
				</div>

				{/* Reputation score (subtle) */}
				{agent.reputationScore && (
					<div className="flex items-center gap-2 border-t pt-3">
						<span className="text-muted-foreground text-xs">
							Reputation Score:
						</span>
						<span className="font-medium text-xs">{agent.reputationScore}</span>
					</div>
				)}
			</div>
		</Card>
	);
}

export function AgentCardSkeleton() {
	return (
		<Card className="overflow-hidden">
			<div className="space-y-4 p-6">
				<div className="flex items-start justify-between gap-3">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-5 w-24" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-9 w-28" />
				</div>
			</div>
		</Card>
	);
}
