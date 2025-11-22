"use client";

import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_VISIBLE_COLORS, MAX_VISIBLE_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ClothingItemStatus = "pending" | "processing" | "ready" | "failed";

type ItemCardProps = {
	imageUrl: string;
	status: ClothingItemStatus;
	category?: string;
	colors?: string[];
	tags?: string[];
	onClick?: () => void;
};

const STATUS_CONFIG: Record<
	ClothingItemStatus,
	{
		label: string;
		icon: React.ReactNode;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	pending: {
		label: "Pending",
		icon: <Clock className="h-3 w-3" />,
		variant: "secondary",
	},
	processing: {
		label: "Processing",
		icon: <Loader2 className="h-3 w-3 animate-spin" />,
		variant: "default",
	},
	ready: {
		label: "Ready",
		icon: <CheckCircle className="h-3 w-3" />,
		variant: "outline",
	},
	failed: {
		label: "Failed",
		icon: <AlertCircle className="h-3 w-3" />,
		variant: "destructive",
	},
};

export function ItemCard({
	imageUrl,
	status,
	category,
	colors,
	tags,
	onClick,
}: ItemCardProps) {
	const statusConfig = STATUS_CONFIG[status];
	const isReady = status === "ready";

	return (
		<Card
			className={cn(
				"group relative overflow-hidden transition-all hover:shadow-lg",
				onClick && "cursor-pointer"
			)}
			onClick={onClick}
		>
			{/* Image */}
			<div className="relative aspect-square bg-muted">
				<Image
					alt={category || "Clothing item"}
					className="object-cover transition-transform group-hover:scale-105"
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					src={imageUrl}
				/>

				{/* Status Badge */}
				<div className="absolute top-2 right-2">
					<Badge className="gap-1" variant={statusConfig.variant}>
						{statusConfig.icon}
						{statusConfig.label}
					</Badge>
				</div>

				{/* Overlay for processing/failed states */}
				{!isReady && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/80">
						{status === "processing" && (
							<div className="text-center">
								<Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
								<p className="font-medium text-sm">Analyzing...</p>
							</div>
						)}
						{status === "failed" && (
							<div className="text-center text-destructive">
								<AlertCircle className="mx-auto mb-2 h-8 w-8" />
								<p className="font-medium text-sm">Analysis Failed</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Info */}
			{isReady && (
				<div className="space-y-2 p-3">
					{/* Category */}
					{category && (
						<p className="truncate font-medium capitalize">{category}</p>
					)}

					{/* Colors */}
					{colors && colors.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{colors.slice(0, MAX_VISIBLE_COLORS).map((color) => (
								<div
									className="h-4 w-4 rounded-full border border-border"
									key={color}
									style={{
										backgroundColor: color.startsWith("#") ? color : undefined,
									}}
									title={color}
								/>
							))}
							{colors.length > MAX_VISIBLE_COLORS && (
								<span className="text-muted-foreground text-xs">
									+{colors.length - MAX_VISIBLE_COLORS}
								</span>
							)}
						</div>
					)}

					{/* Tags */}
					{tags && tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
								<Badge className="text-xs" key={tag} variant="secondary">
									{tag}
								</Badge>
							))}
							{tags.length > MAX_VISIBLE_TAGS && (
								<Badge className="text-xs" variant="outline">
									+{tags.length - MAX_VISIBLE_TAGS}
								</Badge>
							)}
						</div>
					)}
				</div>
			)}
		</Card>
	);
}

export function ItemCardSkeleton() {
	return (
		<Card className="overflow-hidden">
			<Skeleton className="aspect-square" />
			<div className="space-y-2 p-3">
				<Skeleton className="h-5 w-24" />
				<div className="flex gap-1">
					<Skeleton className="h-4 w-4 rounded-full" />
					<Skeleton className="h-4 w-4 rounded-full" />
					<Skeleton className="h-4 w-4 rounded-full" />
				</div>
				<div className="flex gap-1">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-20" />
				</div>
			</div>
		</Card>
	);
}
