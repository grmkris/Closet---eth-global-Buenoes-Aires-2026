"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import type { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Camera, ImageOff, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterDrawer } from "@/components/wardrobe/filter-drawer";
import { ItemCardMinimal } from "@/components/wardrobe/item-card-minimal";
import { ItemDetailDialog } from "@/components/wardrobe/item-detail-dialog";
import { StatusChipsMinimal } from "@/components/wardrobe/status-chips-minimal";
import { UploadFab } from "@/components/wardrobe/upload-fab";
import { UploadModal } from "@/components/wardrobe/upload-modal";
import { useFilterParams } from "@/hooks/use-filter-params";
import { orpc } from "@/utils/orpc";

const ITEMS_PER_PAGE = 24;

function getItemCardStatus(
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

function calculateStatusCounts(
	allItems: Array<{ status: string }>,
	totalItems: number
) {
	return {
		all: totalItems,
		ready: allItems.filter((item) => item.status === "completed").length,
		analyzing: allItems.filter(
			(item) =>
				item.status === "awaiting_upload" ||
				item.status === "queued" ||
				item.status === "processing_image" ||
				item.status === "analyzing"
		).length,
		failed: allItems.filter((item) => item.status === "failed").length,
	};
}

function createFilterHandlers(
	filters: Record<string, unknown>,
	setFilters: (f: Record<string, unknown>) => void,
	clearFilters: () => void
) {
	return {
		onSearchChange: (search: string | undefined) => {
			setFilters({ ...filters, search });
		},
		onCategoryChange: (categories: string[]) => {
			setFilters({ ...filters, categories });
		},
		onColorChange: (colors: string[]) => {
			setFilters({ ...filters, colors });
		},
		onTagChange: (tags: string[]) => {
			setFilters({ ...filters, tags });
		},
		onClearFilters: () => {
			clearFilters();
		},
	};
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <	>
export function WardrobeGallery() {
	const [selectedItemId, setSelectedItemId] = useState<ClothingItemId | null>(
		null
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [uploadModalOpen, setUploadModalOpen] = useState(false);
	const { filters, setFilters, clearFilters, hasActiveFilters } =
		useFilterParams();

	// Fetch available tags for filtering
	const { data: tagData } = useQuery(orpc.wardrobe.getTags.queryOptions());

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
				status: filters.status,
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
						(item) =>
							item.status === "awaiting_upload" ||
							item.status === "queued" ||
							item.status === "processing_image" ||
							item.status === "analyzing"
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
	const statusCounts = calculateStatusCounts(allItems, totalItems);
	const processingCount = statusCounts.analyzing;

	// Filter handlers
	const activeFilterCount =
		(filters.search ? 1 : 0) +
		(filters.categories?.length || 0) +
		(filters.colors?.length || 0) +
		(filters.tags?.length || 0);

	const filterHandlers = createFilterHandlers(
		filters,
		setFilters,
		clearFilters
	);

	// Loading state
	if (isLoading) {
		return (
			<div className="space-y-4 px-4 py-3 pb-24 md:px-6 md:pb-6">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-8 w-32" />
				<div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:gap-2 lg:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
						<Skeleton className="aspect-square w-full" key={key} />
					))}
				</div>
				<UploadFab onClick={() => setUploadModalOpen(true)} />
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className="space-y-4 px-4 py-3 pb-24 md:px-6 md:pb-6">
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-semibold text-lg">Failed to load items</h3>
					<p className="text-muted-foreground text-sm">{error.message}</p>
				</div>
				<UploadFab onClick={() => setUploadModalOpen(true)} />
			</div>
		);
	}

	// Empty state (no items at all)
	if (totalItems === 0 && !hasActiveFilters) {
		return (
			<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center px-4 text-center">
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed">
					<Camera className="h-10 w-10 text-muted-foreground" />
				</div>
				<h3 className="mt-4 font-semibold text-lg">No items yet</h3>
				<p className="mt-2 text-muted-foreground text-sm">
					Upload your first clothing item to get started
				</p>
				<Button
					className="mt-6"
					onClick={() => setUploadModalOpen(true)}
					size="lg"
				>
					<Camera className="mr-2 h-4 w-4" />
					Upload Photos
				</Button>
				<UploadFab onClick={() => setUploadModalOpen(true)} />
			</div>
		);
	}

	return (
		<div className="space-y-4 px-4 py-3 pb-24 md:px-6 md:pb-6">
			{/* Search Bar */}
			<div className="relative">
				<Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					className="h-10 pl-9"
					onChange={(e) => {
						const value = e.target.value;
						// Debounce search
						setTimeout(() => {
							filterHandlers.onSearchChange(value || undefined);
						}, 300);
					}}
					placeholder="Search your wardrobe"
					type="search"
				/>
			</div>

			{/* Processing Banner (if active) */}
			{processingCount > 0 && (
				<Card className="flex items-center gap-3 border-l-4 border-l-primary p-3">
					<Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
					<p className="text-sm">
						Processing {processingCount}{" "}
						{processingCount > 1 ? "items" : "item"}
					</p>
				</Card>
			)}

			{/* Status Chips + Filter Button */}
			<div className="flex items-center gap-2">
				<div className="flex-1 overflow-hidden">
					<StatusChipsMinimal
						activeStatus={filters.status || "all"}
						onStatusChange={(status) => {
							if (status === "all") {
								setFilters({ ...filters, status: undefined });
							} else {
								setFilters({
									...filters,
									status: status as ClothingItemStatus,
								});
							}
						}}
						statusCounts={statusCounts}
					/>
				</div>
				<FilterDrawer
					activeFilterCount={activeFilterCount}
					filters={filters}
					handlers={filterHandlers}
					hasActiveFilters={hasActiveFilters}
					tagData={tagData}
				/>
			</div>

			{/* Item Count */}
			<p className="text-muted-foreground text-xs">
				{allItems.length} {allItems.length === 1 ? "item" : "items"}
				{allItems.length !== totalItems && ` of ${totalItems}`}
			</p>

			{/* No results after filtering */}
			{allItems.length === 0 && hasActiveFilters && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-semibold text-lg">No items match your filters</h3>
					<p className="text-muted-foreground text-sm">
						Try adjusting your search or filters
					</p>
					<Button className="mt-4" onClick={clearFilters} variant="outline">
						Clear filters
					</Button>
				</div>
			)}

			{/* Items Grid - Edge to Edge */}
			{allItems.length > 0 && (
				<>
					<div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:gap-2 lg:grid-cols-4">
						{allItems.map((item) => {
							// Extract metadata for overlay
							const category = item.categories[0]?.category?.displayName;
							const tags = item.tags.map((t) => t.tag.name);

							return (
								<ItemCardMinimal
									category={category}
									id={item.id}
									imageUrl={item.thumbnailUrl || item.imageUrl}
									key={item.id}
									name="Item"
									onClick={() => {
										setSelectedItemId(item.id);
										setDialogOpen(true);
									}}
									status={getItemCardStatus(item.status)}
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

			{/* Upload FAB */}
			<UploadFab onClick={() => setUploadModalOpen(true)} />

			{/* Upload Modal */}
			<UploadModal onOpenChange={setUploadModalOpen} open={uploadModalOpen} />

			{/* Item Detail Dialog */}
			<ItemDetailDialog
				itemId={selectedItemId}
				onOpenChange={setDialogOpen}
				open={dialogOpen}
			/>
		</div>
	);
}
