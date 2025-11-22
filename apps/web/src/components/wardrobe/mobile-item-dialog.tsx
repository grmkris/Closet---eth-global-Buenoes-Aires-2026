"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";
import { useItemDelete } from "./hooks/use-item-delete";
import { ItemDetailContent } from "./item-detail-content";
import { ItemDetailFooter } from "./item-detail-footer";

type MobileItemDialogProps = {
	itemId: ClothingItemId | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function MobileItemDialog({
	itemId,
	open,
	onOpenChange,
}: MobileItemDialogProps) {
	const { data: item, isLoading } = useQuery(
		orpc.wardrobe.getItem.queryOptions({
			input: { itemId: itemId as ClothingItemId },
			enabled: !!itemId && open,
		})
	);

	const deleteState = useItemDelete({ onSuccess: () => onOpenChange(false) });

	return (
		<Drawer onOpenChange={onOpenChange} open={open}>
			<DrawerContent className="max-h-[90vh]">
				{isLoading && (
					<div className="space-y-4 p-4">
						<Skeleton className="aspect-square w-full" />
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-full" />
					</div>
				)}
				{!isLoading && item && (
					<>
						<DrawerHeader>
							<DrawerTitle>
								{item.categories[0]?.category?.displayName || "Clothing Item"}
							</DrawerTitle>
							<DrawerDescription>
								Added {new Date(item.createdAt).toLocaleDateString()}
							</DrawerDescription>
						</DrawerHeader>

						<ItemDetailContent item={item} variant="mobile" />

						<ItemDetailFooter
							deleteState={deleteState}
							itemId={itemId as ClothingItemId}
							variant="mobile"
						/>
					</>
				)}
				{!(isLoading || item) && (
					<div className="py-8 text-center">
						<AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">Item not found</p>
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
}
