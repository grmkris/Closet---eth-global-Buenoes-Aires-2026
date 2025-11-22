"use client";

import type { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_VISIBLE_COLORS, MAX_VISIBLE_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ItemCardProps = {
	imageUrl: string;
	thumbnailUrl?: string | null;
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
	awaiting_upload: {
		label: "Uploading",
		icon: <Clock className="h-3 w-3" />,
		variant: "secondary",
	},
	queued: {
		label: "Queued",
		icon: <Clock className="h-3 w-3" />,
		variant: "secondary",
	},
	processing_image: {
		label: "Converting",
		icon: <Loader2 className="h-3 w-3 animate-spin" />,
		variant: "default",
	},
	analyzing: {
		label: "Analyzing",
		icon: <Loader2 className="h-3 w-3 animate-spin" />,
		variant: "default",
	},
	completed: {
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
	thumbnailUrl,
	status,
	category,
	colors,
	tags,
	onClick,
}: ItemCardProps) {
	// Use thumbnail if available, otherwise fall back to full image
	const displayUrl = thumbnailUrl || imageUrl;
	const statusConfig = STATUS_CONFIG[status];
	const isReady = status === "completed";

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
					loading="lazy"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					src={displayUrl}
					width={100}
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
						{status === "processing_image" && (
							<div className="text-center">
								<Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
								<p className="font-medium text-sm">Converting...</p>
							</div>
						)}
						{status === "analyzing" && (
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
