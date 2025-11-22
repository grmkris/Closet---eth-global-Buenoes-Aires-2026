"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { client, orpc, queryClient } from "@/utils/orpc";
import type { WardrobeItemsResponse } from "@/utils/orpc-types";

type ItemDetailDialogProps = {
	itemId: ClothingItemId | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ItemDetailDialog({
	itemId,
	open,
	onOpenChange,
}: ItemDetailDialogProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const isMobile = useIsMobile();

	const { data: item, isLoading } = useQuery(
		orpc.wardrobe.getItem.queryOptions({
			input: { itemId: itemId as ClothingItemId },
			enabled: !!itemId && open,
		})
	);

	const deleteMutation = useMutation({
		mutationFn: (variables: { itemId: ClothingItemId }) =>
			client.wardrobe.deleteItem(variables),
		onMutate: async (variables) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});

			// Snapshot previous value
			const previousItems = queryClient.getQueryData(
				orpc.wardrobe.getItems.queryKey({ input: {} })
			);

			// Optimistically update by removing the item
			queryClient.setQueryData(
				orpc.wardrobe.getItems.queryKey({ input: {} }),
				(old: WardrobeItemsResponse | undefined) => {
					if (!old) {
						return old;
					}
					return {
						...old,
						items: old.items.filter((i) => i.id !== variables.itemId),
						pagination: {
							...old.pagination,
							total: old.pagination.total - 1,
						},
					};
				}
			);

			// Close dialog immediately
			onOpenChange(false);

			return { previousItems };
		},
		onSuccess: () => {
			toast.success("Item deleted successfully");
		},
		onError: (error, _variables, context) => {
			toast.error(`Failed to delete item: ${error.message}`);

			// Rollback on error
			if (context?.previousItems) {
				queryClient.setQueryData(
					orpc.wardrobe.getItems.queryKey({ input: {} }),
					context.previousItems
				);
			}
		},
		onSettled: () => {
			// Refetch to ensure sync
			queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});
		},
	});

	const handleDelete = () => {
		if (!itemId) {
			return;
		}
		deleteMutation.mutate({ itemId });
	};

	// Group tags by type
	const tagsByType = item?.tags.reduce(
		(acc, { tag }) => {
			const typeName = tag.type.displayName;
			if (!acc[typeName]) {
				acc[typeName] = [];
			}
			acc[typeName].push(tag.name);
			return acc;
		},
		{} as Record<string, string[]>
	);

	const getStatusVariant = (status: string) => {
		if (status === "ready") {
			return "outline";
		}
		if (status === "failed") {
			return "destructive";
		}
		return "default";
	};

	// Shared content component
	const Content = () => (
		<>
			{isLoading && (
				<div className="space-y-4">
					<Skeleton className="aspect-square w-full" />
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-full" />
				</div>
			)}
			{!isLoading && item && (
				<>
					{isMobile ? (
						<DrawerHeader>
							<DrawerTitle>
								{item.categories[0]?.category?.displayName || "Clothing Item"}
							</DrawerTitle>
							<DrawerDescription>
								Added {new Date(item.createdAt).toLocaleDateString()}
							</DrawerDescription>
						</DrawerHeader>
					) : (
						<DialogHeader>
							<DialogTitle>
								{item.categories[0]?.category?.displayName || "Clothing Item"}
							</DialogTitle>
							<DialogDescription>
								Added {new Date(item.createdAt).toLocaleDateString()}
							</DialogDescription>
						</DialogHeader>
					)}

					<div className={isMobile ? "space-y-6 overflow-y-auto p-4" : "space-y-6"}>
						{/* Image Preview */}
						<div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
							<Image
								alt={
									item.categories[0]?.category?.displayName || "Clothing item"
								}
								className="object-cover"
								fill
								priority
								sizes="(max-width: 768px) 100vw, 50vw"
								src={item.imageUrl}
							/>
						</div>

						{/* Status */}
						<div>
							<h3 className="mb-2 font-semibold text-sm">Status</h3>
							<Badge variant={getStatusVariant(item.status)}>
								{item.status === "processing" && (
									<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								)}
								{item.status}
							</Badge>
						</div>

						{/* Categories */}
						{item.categories.length > 0 && (
							<div>
								<h3 className="mb-2 font-semibold text-sm">Categories</h3>
								<div className="flex flex-wrap gap-2">
									{item.categories.map(({ category }) => (
										<Badge key={category.id} variant="secondary">
											{category.displayName}
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Colors */}
						{item.colors.length > 0 && (
							<div>
								<h3 className="mb-2 font-semibold text-sm">Colors</h3>
								<div className="flex flex-wrap items-center gap-3">
									{item.colors.map(({ color }) => (
										<div className="flex items-center gap-2" key={color.id}>
											<div
												className="h-8 w-8 rounded-md border-2 border-border"
												style={{
													backgroundColor: color.hexCode || "#cccccc",
												}}
												title={color.name}
											/>
											<span className="text-sm capitalize">{color.name}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Tags grouped by type */}
						{tagsByType && Object.keys(tagsByType).length > 0 && (
							<div>
								<h3 className="mb-2 font-semibold text-sm">Tags</h3>
								<div className="space-y-3">
									{Object.entries(tagsByType).map(([typeName, tags]) => (
										<div key={typeName}>
											<p className="mb-1 text-muted-foreground text-xs">
												{typeName}
											</p>
											<div className="flex flex-wrap gap-1">
												{tags.map((tagName) => (
													<Badge
														className="text-xs"
														key={tagName}
														variant="outline"
													>
														{tagName}
													</Badge>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Analysis info */}
						{item.analysis && (
							<div className="text-muted-foreground text-xs">
								Analysis version: {item.analysis.modelVersion}
							</div>
						)}
					</div>

					{isMobile ? (
						<DrawerFooter className="pt-2">
							{showDeleteConfirm ? (
								<div className="flex w-full flex-col gap-2">
									<Button
										className="h-12 w-full"
										disabled={deleteMutation.isPending}
										onClick={handleDelete}
										variant="destructive"
									>
										{deleteMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Deleting...
											</>
										) : (
											"Confirm Delete"
										)}
									</Button>
									<Button
										className="h-12 w-full"
										disabled={deleteMutation.isPending}
										onClick={() => setShowDeleteConfirm(false)}
										variant="outline"
									>
										Cancel
									</Button>
								</div>
							) : (
								<Button
									className="h-12 w-full"
									disabled={deleteMutation.isPending}
									onClick={() => setShowDeleteConfirm(true)}
									variant="destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</Button>
							)}
						</DrawerFooter>
					) : (
						<DialogFooter>
							{showDeleteConfirm ? (
								<div className="flex w-full gap-2 sm:w-auto">
									<Button
										disabled={deleteMutation.isPending}
										onClick={() => setShowDeleteConfirm(false)}
										size="sm"
										variant="outline"
									>
										Cancel
									</Button>
									<Button
										disabled={deleteMutation.isPending}
										onClick={handleDelete}
										size="sm"
										variant="destructive"
									>
										{deleteMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Deleting...
											</>
										) : (
											"Confirm Delete"
										)}
									</Button>
								</div>
							) : (
								<Button
									disabled={deleteMutation.isPending}
									onClick={() => setShowDeleteConfirm(true)}
									size="sm"
									variant="destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</Button>
							)}
						</DialogFooter>
					)}
				</>
			)}
			{!(isLoading || item) && (
				<div className="py-8 text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<p className="text-muted-foreground text-sm">Item not found</p>
				</div>
			)}
		</>
	);

	if (isMobile) {
		return (
			<Drawer onOpenChange={onOpenChange} open={open}>
				<DrawerContent className="max-h-[90vh]">
					<Content />
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
				<Content />
			</DialogContent>
		</Dialog>
	);
}
