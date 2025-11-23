import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useState } from "react";

/**
 * Maps wardrobe item status to ItemCardMinimal status type
 */
export function getItemCardStatus(
	itemStatus: string
): "ready" | "failed" | "analyzing" {
	if (itemStatus === "completed") {
		return "ready";
	}
	if (itemStatus === "failed") {
		return "failed";
	}
	return "analyzing";
}

/**
 * Hook for managing item detail dialog state
 * Provides consistent pattern for opening item details across tool renderers
 */
export function useItemDetail() {
	const [selectedItemId, setSelectedItemId] = useState<ClothingItemId | null>(
		null
	);
	const [dialogOpen, setDialogOpen] = useState(false);

	const openItem = (itemId: ClothingItemId) => {
		setSelectedItemId(itemId);
		setDialogOpen(true);
	};

	const closeDialog = () => {
		setDialogOpen(false);
	};

	return {
		selectedItemId,
		dialogOpen,
		setDialogOpen,
		openItem,
		closeDialog,
	};
}
