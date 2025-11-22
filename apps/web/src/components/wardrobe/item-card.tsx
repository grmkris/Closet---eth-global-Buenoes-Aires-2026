"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import Image from "next/image";

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
					src={imageUrl}
					alt={category || "Clothing item"}
					fill
					className="object-cover transition-transform group-hover:scale-105"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
				/>

				{/* Status Badge */}
				<div className="absolute top-2 right-2">
					<Badge variant={statusConfig.variant} className="gap-1">
						{statusConfig.icon}
						{statusConfig.label}
					</Badge>
				</div>

				{/* Overlay for processing/failed states */}
				{!isReady && (
					<div className="absolute inset-0 bg-background/80 flex items-center justify-center">
						{status === "processing" && (
							<div className="text-center">
								<Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
								<p className="text-sm font-medium">Analyzing...</p>
							</div>
						)}
						{status === "failed" && (
							<div className="text-center text-destructive">
								<AlertCircle className="h-8 w-8 mx-auto mb-2" />
								<p className="text-sm font-medium">Analysis Failed</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Info */}
			{isReady && (
				<div className="p-3 space-y-2">
					{/* Category */}
					{category && (
						<p className="font-medium capitalize truncate">{category}</p>
					)}

					{/* Colors */}
					{colors && colors.length > 0 && (
						<div className="flex gap-1 flex-wrap">
							{colors.slice(0, 4).map((color, i) => (
								<div
									key={i}
									className="h-4 w-4 rounded-full border border-border"
									style={{
										backgroundColor: color.startsWith("#") ? color : undefined,
									}}
									title={color}
								/>
							))}
							{colors.length > 4 && (
								<span className="text-xs text-muted-foreground">
									+{colors.length - 4}
								</span>
							)}
						</div>
					)}

					{/* Tags */}
					{tags && tags.length > 0 && (
						<div className="flex gap-1 flex-wrap">
							{tags.slice(0, 3).map((tag) => (
								<Badge key={tag} variant="secondary" className="text-xs">
									{tag}
								</Badge>
							))}
							{tags.length > 3 && (
								<Badge variant="outline" className="text-xs">
									+{tags.length - 3}
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
			<div className="p-3 space-y-2">
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
