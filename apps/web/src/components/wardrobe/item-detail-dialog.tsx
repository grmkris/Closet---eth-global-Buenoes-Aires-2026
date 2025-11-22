"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DesktopItemDialog } from "./desktop-item-dialog";
import { MobileItemDialog } from "./mobile-item-dialog";

type ItemDetailDialogProps = {
	itemId: ClothingItemId | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ItemDetailDialog(props: ItemDetailDialogProps) {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <MobileItemDialog {...props} />;
	}

	return <DesktopItemDialog {...props} />;
}
