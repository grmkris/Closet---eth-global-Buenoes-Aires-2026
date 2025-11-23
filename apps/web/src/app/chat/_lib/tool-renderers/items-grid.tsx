"use client";

import { CheckCircle, ShirtIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Common item type shared between searchWardrobe and showItems
 */
export type GridItem = {
	id: string;
	thumbnailUrl: string | null;
	categories: string[];
	colors: Array<{
		name: string;
		hex: string | null;
	}>;
	tagsByType: Record<string, string[]>;
};

type ItemsGridProps = {
	/** Array of clothing items to display */
	items: GridItem[];
	/** Header icon component */
	headerIcon: ReactNode;
	/** Header title text */
	headerTitle: string;
	/** Badge content (e.g., count, status) */
	badgeContent: ReactNode;
	/** Optional footer content */
	footer?: ReactNode;
	/** Empty state message */
	emptyMessage: string;
	/** Empty state badge text */
	emptyBadge?: string;
};

/**
 * Shared grid component for displaying clothing items
 * Used by both wardrobe search and show items renderers
 */
export function ItemsGrid({
	items,
	headerIcon,
	headerTitle,
	badgeContent,
	footer,
	emptyMessage,
	emptyBadge = "No results",
}: ItemsGridProps) {
	if (items.length === 0) {
		return (
			<div className="my-3 overflow-hidden rounded-lg border bg-card shadow-sm">
				<div className="flex items-center gap-2 border-b bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3">
					{headerIcon}
					<span className="font-medium text-sm">{headerTitle}</span>
					<Badge className="ml-auto" variant="secondary">
						{emptyBadge}
					</Badge>
				</div>
				<div className="p-8 text-center text-muted-foreground text-sm">
					{emptyMessage}
				</div>
			</div>
		);
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card shadow-sm">
			{/* Header with subtle gradient */}
			<div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-3">
				{headerIcon}
				<span className="font-medium text-sm">{headerTitle}</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-primary" />
					{badgeContent}
				</Badge>
			</div>

			{/* Grid of items - mobile-first with larger items */}
			<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
				{items.map((item) => (
					<div
						className="overflow-hidden rounded-lg border bg-background shadow-sm"
						key={item.id}
					>
						{/* Thumbnail */}
						<div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/20 to-muted/5">
							{item.thumbnailUrl ? (
								<Image
									alt={item.categories.join(", ")}
									className="object-cover"
									fill
									sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
									src={item.thumbnailUrl}
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<ShirtIcon className="h-14 w-14 text-muted-foreground/20" />
								</div>
							)}
						</div>

						{/* Metadata with improved spacing */}
						<div className="space-y-1.5 p-3">
							{/* Categories */}
							<div className="font-medium text-xs leading-tight">
								{item.categories.join(", ") || "Unknown"}
							</div>

							{/* Colors with enhanced presentation */}
							{item.colors.length > 0 && (
								<div className="flex flex-wrap items-center gap-1.5">
									{item.colors.map((color, idx) => (
										<div
											className="flex items-center gap-1"
											key={`${color.name}-${idx}`}
										>
											{color.hex && (
												<div
													className="h-3.5 w-3.5 rounded-full border-2 shadow-sm"
													style={{ backgroundColor: color.hex }}
													title={color.name}
												/>
											)}
											{idx === 0 && (
												<span className="text-muted-foreground text-xs">
													{color.name}
												</span>
											)}
										</div>
									))}
								</div>
							)}

							{/* Tags with improved visibility */}
							{Object.entries(item.tagsByType).length > 0 && (
								<div className="flex flex-wrap gap-1">
									{Object.entries(item.tagsByType)
										.slice(0, 1)
										.map(([type, tags]) => (
											<Badge className="text-xs" key={type} variant="outline">
												{tags[0]}
											</Badge>
										))}
									{Object.keys(item.tagsByType).length > 1 && (
										<Badge className="text-xs" variant="secondary">
											+{Object.keys(item.tagsByType).length - 1}
										</Badge>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Footer with gradient */}
			{footer && (
				<div className="border-t bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-2.5">
					<p className="text-muted-foreground text-xs">{footer}</p>
				</div>
			)}
		</div>
	);
}
