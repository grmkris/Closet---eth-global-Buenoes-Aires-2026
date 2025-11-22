"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FilterParams } from "@/hooks/use-filter-params";
import { orpc } from "@/utils/orpc";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
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
	const [isExpanded, setIsExpanded] = useState(true);

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

	const handleColorChange = useCallback(
		(colors: string[]) => {
			onFiltersChange({ ...filters, colors });
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

	const activeFilterCount =
		(filters.categories?.length || 0) +
		(filters.tags?.length || 0) +
		(filters.colors?.length || 0);

	return (
		<Card className="overflow-hidden p-4">
			{/* Header - Always Visible */}
			<button
				className="flex w-full items-center justify-between py-2 text-left"
				onClick={() => setIsExpanded(!isExpanded)}
				type="button"
			>
				<div className="flex items-center gap-2">
					<h3 className="font-semibold text-sm">Filters</h3>
					{hasActiveFilters && !isExpanded && (
						<span className="flex h-5 items-center justify-center rounded-full bg-primary px-2 text-primary-foreground text-xs">
							{activeFilterCount}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{hasActiveFilters && (
						<Button
							className="h-8 px-2"
							onClick={(e) => {
								e.stopPropagation();
								onClear();
							}}
							size="sm"
							variant="ghost"
						>
							<X className="mr-1 h-3 w-3" />
							Clear
						</Button>
					)}
					{isExpanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{/* Collapsible Content */}
			{isExpanded && (
				<div className="space-y-4 pt-2">
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

					{/* Colors */}
					{tagData && tagData.colors && tagData.colors.length > 0 && (
						<ColorFilter
							colors={tagData.colors}
							onChange={handleColorChange}
							selected={filters.colors || []}
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
								{activeFilterCount > 0 &&
									`${activeFilterCount} filter${
										activeFilterCount > 1 ? "s" : ""
									} active`}
							</p>
						</div>
					)}
				</div>
			)}
		</Card>
	);
}
