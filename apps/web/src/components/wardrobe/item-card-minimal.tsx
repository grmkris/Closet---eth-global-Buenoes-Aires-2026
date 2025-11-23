"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ItemStatus = "ready" | "analyzing" | "converting" | "queued" | "failed";

type ItemCardMinimalProps = {
	id: string;
	imageUrl: string;
	name: string;
	status: ItemStatus;
	category?: string;
	tags?: string[];
	onClick: () => void;
};

export function ItemCardMinimal({
	imageUrl,
	name,
	status,
	category,
	tags = [],
	onClick,
}: ItemCardMinimalProps) {
	const isProcessing = ["analyzing", "converting", "queued"].includes(status);
	const isFailed = status === "failed";

	// Limit tags to display (max 2 on mobile, 3 on desktop)
	const displayTags = tags.slice(0, 2);
	const remainingTagsCount = tags.length - displayTags.length;

	return (
		<button
			className="group relative aspect-square w-full overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-90"
			onClick={onClick}
			type="button"
		>
			<Image
				alt={name}
				className={cn(
					"h-full w-full object-cover",
					isProcessing && "opacity-50"
				)}
				fill
				loading="lazy"
				sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
				src={imageUrl}
			/>

			{/* Processing overlay - centered spinner */}
			{isProcessing && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/30">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</div>
			)}

			{/* Status dot indicator - top left */}
			{(isProcessing || isFailed) && (
				<div className="absolute top-2 left-2">
					{isProcessing && (
						<div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
					)}
					{isFailed && <div className="h-2 w-2 rounded-full bg-destructive" />}
				</div>
			)}

			{/* Glassmorphism metadata overlay - always visible for ready items */}
			{!(isProcessing || isFailed) && (category || tags.length > 0) && (
				<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent p-2 backdrop-blur-sm">
					{/* Category */}
					{category && (
						<p className="truncate font-medium text-white text-xs">
							{category}
						</p>
					)}

					{/* Tags */}
					{tags.length > 0 && (
						<div className="mt-1 flex flex-wrap items-center gap-1">
							{displayTags.map((tag) => (
								<span
									className="inline-flex items-center rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm"
									key={tag}
								>
									{tag}
								</span>
							))}
							{remainingTagsCount > 0 && (
								<span className="text-[10px] text-white/70">
									+{remainingTagsCount}
								</span>
							)}
						</div>
					)}
				</div>
			)}

			{/* Processing state overlay */}
			{isProcessing && (
				<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent p-2 backdrop-blur-sm">
					<p className="truncate font-medium text-white text-xs">
						Analyzing...
					</p>
				</div>
			)}

			{/* Failed state overlay */}
			{isFailed && (
				<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-destructive/60 via-destructive/40 to-transparent p-2 backdrop-blur-sm">
					<p className="truncate font-medium text-white text-xs">
						Failed to process
					</p>
				</div>
			)}
		</button>
	);
}
