"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";
import { useItemDelete } from "./hooks/use-item-delete";
import { ItemDetailContent } from "./item-detail-content";
import { ItemDetailFooter } from "./item-detail-footer";

type DesktopItemDialogProps = {
	itemId: ClothingItemId | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function DesktopItemDialog({
	itemId,
	open,
	onOpenChange,
}: DesktopItemDialogProps) {
	const { data: item, isLoading } = useQuery(
		orpc.wardrobe.getItem.queryOptions({
			input: { itemId: itemId as ClothingItemId },
			enabled: !!itemId && open,
		})
	);

	const deleteState = useItemDelete({ onSuccess: () => onOpenChange(false) });

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
				{isLoading && (
					<div className="space-y-4">
						<Skeleton className="aspect-square w-full" />
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-full" />
					</div>
				)}
				{!isLoading && item && (
					<>
						<DialogHeader>
							<DialogTitle>
								{item.categories[0]?.category?.displayName || "Clothing Item"}
							</DialogTitle>
							<DialogDescription>
								Added {new Date(item.createdAt).toLocaleDateString()}
							</DialogDescription>
						</DialogHeader>

						<ItemDetailContent item={item} variant="desktop" />

						<ItemDetailFooter
							deleteState={deleteState}
							itemId={itemId as ClothingItemId}
							variant="desktop"
						/>
					</>
				)}
				{!(isLoading || item) && (
					<div className="py-8 text-center">
						<AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">Item not found</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
