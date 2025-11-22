import { useCallback } from "react";
import type { FilterParams } from "@/hooks/use-filter-params";

type UseFilterHandlersParams = {
	filters: FilterParams;
	onFiltersChange: (filters: FilterParams) => void;
};

export function useFilterHandlers({
	filters,
	onFiltersChange,
}: UseFilterHandlersParams) {
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

	return {
		onSearchChange: handleSearchChange,
		onCategoryChange: handleCategoryChange,
		onTagChange: handleTagChange,
		onColorChange: handleColorChange,
	};
}
