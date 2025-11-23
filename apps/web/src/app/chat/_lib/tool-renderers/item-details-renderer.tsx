"use client";

import { CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ItemCardMinimal } from "@/components/wardrobe/item-card-minimal";
import { ItemDetailDialog } from "@/components/wardrobe/item-detail-dialog";
import { getItemCardStatus, useItemDetail } from "./shared";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for getItemDetails tool
 * Shows a clickable preview card that opens full details in a dialog
 */
export function ItemDetailsRenderer({ part }: ToolRendererProps) {
	const { selectedItemId, dialogOpen, setDialogOpen, openItem } =
		useItemDetail();
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "getItemDetails");

	// Only render for successful results
	if (status !== "success" || !output) {
		return null;
	}

	// Prefer processed image, fall back to original, then thumbnail
	const imageUrl =
		output.processedImageUrl || output.imageUrl || output.thumbnailUrl;

	// Map data to ItemCardMinimal format
	const category = output.categories[0] || undefined;
	const tags = Object.values(output.tagsByType).flat().slice(0, 3);

	return (
		<>
			<div className="my-3 max-w-full overflow-hidden rounded-lg border bg-card">
				{/* Header - clean, no gradient */}
				<div className="flex items-center gap-2 border-b px-4 py-3">
					<Info className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium text-sm">Item Details</span>
					<Badge className="ml-auto" variant="secondary">
						<CheckCircle className="mr-1 h-3 w-3 text-primary" />
						Found
					</Badge>
				</div>

				{/* Clickable preview card */}
				<div className="p-4">
					<div className="mx-auto max-w-xs">
						<ItemCardMinimal
							category={category}
							id={output.id}
							imageUrl={imageUrl || ""}
							name={category || "Item"}
							onClick={() => openItem(output.id)}
							status={getItemCardStatus("completed")}
							tags={tags}
						/>
					</div>
					<p className="mt-3 text-center text-muted-foreground text-xs">
						Tap to view full details
					</p>
				</div>
			</div>

			{/* Full detail dialog */}
			<ItemDetailDialog
				itemId={selectedItemId}
				onOpenChange={setDialogOpen}
				open={dialogOpen}
			/>
		</>
	);
}
