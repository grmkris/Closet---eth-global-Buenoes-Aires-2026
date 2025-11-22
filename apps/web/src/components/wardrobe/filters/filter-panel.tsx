"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { FilterParams } from "@/hooks/use-filter-params";
import { orpc } from "@/utils/orpc";
import { FilterPanelHeader } from "./filter-panel-header";
import { FilterSections } from "./filter-sections";
import { useFilterHandlers } from "./use-filter-handlers";

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

	// Get filter change handlers
	const handlers = useFilterHandlers({ filters, onFiltersChange });

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
			<FilterPanelHeader
				activeFilterCount={activeFilterCount}
				hasActiveFilters={hasActiveFilters}
				isExpanded={isExpanded}
				onClear={onClear}
				onToggleExpanded={() => setIsExpanded(!isExpanded)}
			/>

			{isExpanded && (
				<FilterSections
					activeFilterCount={activeFilterCount}
					filters={filters}
					handlers={handlers}
					hasActiveFilters={hasActiveFilters}
					tagData={tagData}
				/>
			)}
		</Card>
	);
}
