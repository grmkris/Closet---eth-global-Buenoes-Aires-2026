"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ImageOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilterPanel } from "@/components/wardrobe/filters/filter-panel";
import { ItemCard, ItemCardSkeleton } from "@/components/wardrobe/item-card";
import { ItemDetailDialog } from "@/components/wardrobe/item-detail-dialog";
import { ProcessingBanner } from "@/components/wardrobe/processing-banner";
import { StatusFilterChips } from "@/components/wardrobe/status-filter-chips";
import { UploadManager } from "@/components/wardrobe/upload-manager";
import { useFilterParams } from "@/hooks/use-filter-params";
import { orpc } from "@/utils/orpc";

const ITEMS_PER_PAGE = 24;

export function WardrobeGallery() {
	const [selectedItemId, setSelectedItemId] = useState<ClothingItemId | null>(
		null
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const { filters, setFilters, clearFilters, hasActiveFilters } =
		useFilterParams();

	// Use infinite query for scrolling
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
	} = useInfiniteQuery(
		orpc.wardrobe.getItems.infiniteOptions({
			input: (pageParam: number | undefined) => ({
				limit: ITEMS_PER_PAGE,
				offset: pageParam,
				search: filters.search,
				categories: filters.categories,
				tags: filters.tags,
				colors: filters.colors,
			}),
			initialPageParam: 0 as number | undefined,
			getNextPageParam: (lastPage) =>
				lastPage.pagination.hasMore
					? lastPage.pagination.offset + lastPage.pagination.limit
					: undefined,
			// Refetch every 5s if there are processing items
			refetchInterval: (query) => {
				const hasProcessing = query.state.data?.pages.some((page) =>
					page.items.some(
						(item) => item.status === "processing" || item.status === "pending"
					)
				);
				return hasProcessing ? POLLING_CONFIG.PROCESSING_INTERVAL_MS : false;
			},
		})
	);

	// Intersection observer for infinite scroll
	const loadMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = loadMoreRef.current;
		if (!(element && hasNextPage) || isFetchingNextPage) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Get all items from all pages
	const allItems = data?.pages.flatMap((page) => page.items) || [];
	const totalItems = data?.pages[0]?.pagination.total || 0;

	// Count items by status
	const statusCounts = {
		all: allItems.length,
		pending: allItems.filter((item) => item.status === "pending").length,
		processing: allItems.filter((item) => item.status === "processing").length,
		ready: allItems.filter((item) => item.status === "ready").length,
		failed: allItems.filter((item) => item.status === "failed").length,
	};

	const processingCount = statusCounts.processing + statusCounts.pending;

	// Loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<UploadManager />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
						<ItemCardSkeleton key={key} />
					))}
				</div>
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className="space-y-6">
				<UploadManager />
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-semibold text-lg">Failed to load items</h3>
					<p className="text-muted-foreground text-sm">{error.message}</p>
				</div>
			</div>
		);
	}

	// Empty state (no items at all)
	if (totalItems === 0 && !hasActiveFilters) {
		return (
			<div className="space-y-6">
				<UploadManager />
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-semibold text-lg">No items yet</h3>
					<p className="text-muted-foreground text-sm">
						Upload your first clothing item to get started
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Processing Status Banner */}
			<ProcessingBanner
				onTap={() => {
					// Scroll to first processing item or show them in filters
					const firstProcessing = allItems.find(
						(item) => item.status === "processing" || item.status === "pending"
					);
					if (firstProcessing) {
						// In the future, we could filter by status
						// For now, just close any modals/drawers
						setDialogOpen(false);
					}
				}}
				processingCount={processingCount}
			/>

			{/* Upload Manager */}
			<UploadManager />

			{/* Status Filter Chips */}
			<StatusFilterChips
				counts={statusCounts}
				onSelect={(status) => {
					if (status === "all") {
						setFilters({ ...filters, status: undefined });
					} else {
						setFilters({ ...filters, status });
					}
				}}
				selected={filters.status || "all"}
			/>

			{/* Filter Panel - Always visible but collapsible */}
			<FilterPanel
				filters={filters}
				hasActiveFilters={hasActiveFilters}
				onClear={clearFilters}
				onFiltersChange={setFilters}
			/>

			{/* Item Count */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{allItems.length} {allItems.length === 1 ? "item" : "items"}
					{allItems.length !== totalItems && ` of ${totalItems}`}
				</p>
			</div>

			{/* No results after filtering */}
			{allItems.length === 0 && hasActiveFilters && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-semibold text-lg">No items match your filters</h3>
					<p className="text-muted-foreground text-sm">
						Try adjusting your search or filters
					</p>
				</div>
			)}

			{/* Items Grid */}
			{allItems.length > 0 && (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{allItems.map((item) => {
							// Extract first category
							const category = item.categories[0]?.category?.displayName;

							// Extract color hex codes or names
							const colors = item.colors.map(
								(c) => c.color.hexCode || c.color.name
							);

							// Extract tag names
							const tags = item.tags.map((t) => t.tag.name);

							return (
								<ItemCard
									category={category}
									colors={colors}
									imageUrl={item.imageUrl}
									key={item.id}
									onClick={() => {
										setSelectedItemId(item.id);
										setDialogOpen(true);
									}}
									status={item.status}
									tags={tags}
								/>
							);
						})}
					</div>

					{/* Load More Trigger */}
					{hasNextPage && (
						<div
							className="flex items-center justify-center py-8"
							ref={loadMoreRef}
						>
							{isFetchingNextPage && (
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							)}
						</div>
					)}
				</>
			)}

			{/* Item Detail Dialog */}
			<ItemDetailDialog
				itemId={selectedItemId}
				onOpenChange={setDialogOpen}
				open={dialogOpen}
			/>
		</div>
	);
}
