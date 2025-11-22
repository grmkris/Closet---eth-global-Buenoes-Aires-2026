"use client";

import type { FilterParams } from "@/hooks/use-filter-params";
import type { UserTagsResponse } from "@/utils/orpc-types";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { SearchFilter } from "./search-filter";
import { TagFilter } from "./tag-filter";

type FilterSectionsProps = {
	tagData: UserTagsResponse | undefined;
	filters: FilterParams;
	handlers: {
		onSearchChange: (search: string | undefined) => void;
		onCategoryChange: (categories: string[]) => void;
		onColorChange: (colors: string[]) => void;
		onTagChange: (tags: string[]) => void;
	};
	activeFilterCount: number;
	hasActiveFilters: boolean;
};

export function FilterSections({
	tagData,
	filters,
	handlers,
	activeFilterCount,
	hasActiveFilters,
}: FilterSectionsProps) {
	return (
		<div className="space-y-4 pt-2">
			{/* Search */}
			<SearchFilter onChange={handlers.onSearchChange} value={filters.search} />

			{/* Categories */}
			{tagData && tagData.categories.length > 0 && (
				<CategoryFilter
					categories={tagData.categories}
					onChange={handlers.onCategoryChange}
					selected={filters.categories || []}
				/>
			)}

			{/* Colors */}
			{tagData?.colors && tagData.colors.length > 0 && (
				<ColorFilter
					colors={tagData.colors}
					onChange={handlers.onColorChange}
					selected={filters.colors || []}
				/>
			)}

			{/* Tags */}
			{tagData && tagData.tags.length > 0 && (
				<TagFilter
					onChange={handlers.onTagChange}
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
	);
}
