"use client";

import { Search } from "lucide-react";
import { ItemsGrid } from "./items-grid";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for searchWardrobe tool
 * Displays clothing items as a thumbnail grid instead of JSON
 */
export function WardrobeSearchRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "searchWardrobe");

	// Only render for successful results
	if (status !== "success" || !output?.items) {
		return null;
	}

	const { items, total, hasMore } = output;

	const badgeContent = (
		<>
			{total} item{total !== 1 ? "s" : ""}
			{hasMore && "+"}
		</>
	);

	const footer = hasMore
		? `Showing ${total} items. More items available in your wardrobe.`
		: undefined;

	return (
		<ItemsGrid
			badgeContent={badgeContent}
			emptyBadge="No results"
			emptyMessage="No items found matching your search criteria"
			footer={footer}
			headerIcon={<Search className="h-4 w-4 text-muted-foreground" />}
			headerTitle="Wardrobe Search"
			items={items}
		/>
	);
}
