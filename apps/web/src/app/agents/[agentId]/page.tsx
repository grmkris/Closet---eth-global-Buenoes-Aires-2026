"use client";

import type { AgentId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress, formatPrice } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

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

export default function AgentDetailPage() {
	const params = useParams();
	const agentId = params.agentId as AgentId;
	const { isConnected } = useAccount();

	const { data: agent, isLoading: agentLoading } = useQuery(
		orpc.agent.get.queryOptions({ input: { id: agentId } })
	);

	const { data: subscriptions, isLoading: subsLoading } = useQuery({
		...orpc.subscription.list.queryOptions(),
		enabled: isConnected,
	});

	const isLoading = agentLoading || subsLoading;
	const hasActiveSubscription = subscriptions?.subscriptions.some(
		(sub) => sub.agentId === agentId && sub.status === "active"
	);

	if (isLoading) {
		return (
			<div className="container space-y-6 py-6">
				<Skeleton className="h-10 w-32" />
				<Card className="p-6">
					<div className="space-y-6">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-12 w-32" />
					</div>
				</Card>
			</div>
		);
	}

	if (!agent) {
		return (
			<div className="container space-y-6 py-6">
				<Alert variant="destructive">
					<AlertTitle>Agent not found</AlertTitle>
					<AlertDescription>
						This agent does not exist or has been removed.
					</AlertDescription>
				</Alert>
				<Button asChild variant="outline">
					<Link href="/agents">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Agents
					</Link>
				</Button>
			</div>
		);
	}

	const specialtyConfig =
		SPECIALTY_COLORS[agent.specialty] || SPECIALTY_COLORS.minimalist;

	return (
		<div className="container space-y-6 py-6 pb-24 md:pb-6">
			{/* Back Button */}
			<Button asChild size="sm" variant="ghost">
				<Link href="/agents">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Agents
				</Link>
			</Button>

			{/* Agent Details Card */}
			<Card className="p-6">
				<div className="space-y-6">
					{/* Header */}
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<h1 className="font-bold text-3xl">{agent.name}</h1>
								{agent.verified && (
									<BadgeCheck className="h-6 w-6 text-blue-500" />
								)}
							</div>
							<Badge
								className={`gap-1 ${specialtyConfig.bg} ${specialtyConfig.text}`}
								variant="secondary"
							>
								<span>{specialtyConfig.icon}</span>
								<span className="capitalize">{agent.specialty}</span>
							</Badge>
						</div>

						<div className="text-right">
							<div className="flex items-baseline gap-1">
								<span className="font-bold text-4xl">
									{formatPrice(agent.priceMonthly)}
								</span>
								<span className="text-muted-foreground">/month</span>
							</div>
							<p className="text-muted-foreground text-sm">Gasless payment</p>
						</div>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<h2 className="font-semibold text-lg">About</h2>
						<p className="text-muted-foreground leading-relaxed">
							{agent.description}
						</p>
					</div>

					{/* Wallet Address */}
					<div className="space-y-2 rounded-lg border bg-muted/50 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Wallet className="h-4 w-4" />
							<span>Agent Wallet</span>
						</div>
						<code className="font-mono text-sm">
							{formatAddress(agent.walletAddress as `0x${string}`)}
						</code>
					</div>

					{/* Reputation */}
					{agent.reputationScore && (
						<div className="flex items-center justify-between border-t pt-4">
							<span className="text-muted-foreground">Reputation Score</span>
							<span className="font-semibold">{agent.reputationScore}</span>
						</div>
					)}

					{/* Subscribe Button */}
					<div className="border-t pt-6">
						{hasActiveSubscription ? (
							<Alert>
								<Sparkles className="h-4 w-4" />
								<AlertTitle>Already subscribed</AlertTitle>
								<AlertDescription>
									You have an active subscription to this agent.
								</AlertDescription>
							</Alert>
						) : (
							<Button asChild className="w-full" size="lg">
								<Link href={`/subscribe/${agentId}`}>
									<Sparkles className="mr-2 h-5 w-5" />
									Subscribe Now
								</Link>
							</Button>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
}
