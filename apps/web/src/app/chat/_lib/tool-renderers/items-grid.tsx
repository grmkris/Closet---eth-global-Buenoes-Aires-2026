"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import type { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { CheckCircle, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ItemCardMinimal } from "@/components/wardrobe/item-card-minimal";
import { ItemDetailDialog } from "@/components/wardrobe/item-detail-dialog";
import { cn } from "@/lib/utils";
import { getItemCardStatus, useItemDetail } from "./shared";

/**
 * Common item type shared between searchWardrobe and showItems
 */
export type GridItem = {
	id: ClothingItemId;
	thumbnailUrl: string | null;

	originalFileName?: string;
	status: ClothingItemStatus;
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
 * Now uses ItemCardMinimal for consistent styling with wardrobe gallery
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
	const { selectedItemId, dialogOpen, setDialogOpen, openItem } =
		useItemDetail();
	const [isCollapsed, setIsCollapsed] = useState(false);

	if (items.length === 0) {
		return (
			<div className="my-3 max-w-full overflow-hidden rounded-lg border bg-card">
				<div className="flex items-center gap-2 border-b px-4 py-3">
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
		<>
			<div className="my-3 max-w-full overflow-hidden rounded-lg border bg-card">
				{/* Clickable header for collapse/expand */}
				<button
					className="flex w-full cursor-pointer items-center gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50"
					onClick={() => setIsCollapsed(!isCollapsed)}
					type="button"
				>
					{headerIcon}
					<span className="font-medium text-sm">{headerTitle}</span>
					<Badge className="ml-auto" variant="secondary">
						<CheckCircle className="mr-1 h-3 w-3 text-primary" />
						{badgeContent}
					</Badge>
					<ChevronDown
						className={cn(
							"ml-2 h-4 w-4 text-muted-foreground transition-transform",
							isCollapsed && "rotate-180"
						)}
					/>
				</button>

				{/* Collapsible content */}
				{!isCollapsed && (
					<>
						{/* Grid of items using ItemCardMinimal */}
						<div className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-3 md:grid-cols-4 md:gap-2">
							{items.map((item) => {
								// Map grid item structure to ItemCardMinimal props
								const category = item.categories[0] || undefined;
								const tags = Object.values(item.tagsByType).flat().slice(0, 3);

								return (
									<ItemCardMinimal
										category={category}
										id={item.id}
										imageUrl={item.thumbnailUrl || ""}
										key={item.id}
										name={item.originalFileName || category || "Item"}
										onClick={() => openItem(item.id)}
										status={getItemCardStatus(item.status || "completed")}
										tags={tags}
									/>
								);
							})}
						</div>

						{/* Footer - clean, no gradient */}
						{footer && (
							<div className="border-t px-4 py-2.5">
								<p className="text-muted-foreground text-xs">{footer}</p>
							</div>
						)}
					</>
				)}
			</div>

			{/* Detail dialog - reused from wardrobe */}
			<ItemDetailDialog
				itemId={selectedItemId}
				onOpenChange={setDialogOpen}
				open={dialogOpen}
			/>
		</>
	);
}
