"use client";

import { Sparkles } from "lucide-react";
import { ItemsGrid } from "./items-grid";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for showItems tool
 * Displays selected clothing items in a clean grid layout
 */
export function ShowItemsRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "showItems");

	// Only render for successful results
	if (status !== "success" || !output?.items) {
		return null;
	}

	const { items, displayedCount, notFound } = output;

	const badgeContent = (
		<>
			{displayedCount} item{displayedCount !== 1 ? "s" : ""}
		</>
	);

	const footer =
		notFound && notFound.length > 0
			? `Note: ${notFound.length} item${notFound.length !== 1 ? "s were" : " was"} not found`
			: undefined;

	const emptyMessage =
		notFound && notFound.length > 0
			? "Some items could not be found"
			: "No items to display";

	return (
		<ItemsGrid
			badgeContent={badgeContent}
			emptyBadge="Not found"
			emptyMessage={emptyMessage}
			footer={footer}
			headerIcon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
			headerTitle="Suggested Items"
			items={items}
		/>
	);
}
