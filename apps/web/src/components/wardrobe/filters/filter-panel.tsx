"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FilterParams } from "@/hooks/use-filter-params";
import { orpc } from "@/utils/orpc";
import { CategoryFilter } from "./category-filter";
import { SearchFilter } from "./search-filter";
import { TagFilter } from "./tag-filter";

type FilterPanelProps = {
	filters: FilterParams;
	onFiltersChange: (filters: FilterParams) => void;
	onClear: () => void;
	hasActiveFilters: boolean;
};

export function FilterPanel({
	filters,
	onFiltersChange,
	onClear,
	hasActiveFilters,
}: FilterPanelProps) {
	// Fetch user's tag statistics for filter options
	const { data: tagData, isLoading } = useQuery(
		orpc.wardrobe.getTags.queryOptions()
	);

	// Memoize filter change handlers to prevent unnecessary re-renders
	const handleSearchChange = useCallback(
		(search: string | undefined) => {
			onFiltersChange({ ...filters, search });
		},
		[filters, onFiltersChange]
	);

	const handleCategoryChange = useCallback(
		(categories: string[]) => {
			onFiltersChange({ ...filters, categories });
		},
		[filters, onFiltersChange]
	);

	const handleTagChange = useCallback(
		(tags: string[]) => {
			onFiltersChange({ ...filters, tags });
		},
		[filters, onFiltersChange]
	);

	if (isLoading) {
		return (
			<Card className="p-4">
				<div className="flex items-center justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			</Card>
		);
	}

	return (
		<Card className="space-y-4 p-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-sm">Filters</h3>
				{hasActiveFilters && (
					<Button
						className="h-auto px-2 py-1"
						onClick={onClear}
						size="sm"
						variant="ghost"
					>
						<X className="mr-1 h-3 w-3" />
						Clear
					</Button>
				)}
			</div>

			{/* Search */}
			<SearchFilter onChange={handleSearchChange} value={filters.search} />

			{/* Categories */}
			{tagData && tagData.categories.length > 0 && (
				<CategoryFilter
					categories={tagData.categories}
					onChange={handleCategoryChange}
					selected={filters.categories || []}
				/>
			)}

			{/* Tags */}
			{tagData && tagData.tags.length > 0 && (
				<TagFilter
					onChange={handleTagChange}
					selected={filters.tags || []}
					tags={tagData.tags}
				/>
			)}

			{/* Active Filters Summary */}
			{hasActiveFilters && (
				<div className="border-t pt-2">
					<p className="text-muted-foreground text-xs">
						{(filters.categories?.length || 0) + (filters.tags?.length || 0) >
							0 &&
							`${
								(filters.categories?.length || 0) + (filters.tags?.length || 0)
							} filter${
								(filters.categories?.length || 0) +
									(filters.tags?.length || 0) >
								1
									? "s"
									: ""
							} active`}
					</p>
				</div>
			)}
		</Card>
	);
}
