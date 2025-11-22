"use client";

import type { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { isClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type FilterParams = {
	search?: string;
	categories?: string[];
	tags?: string[];
	colors?: string[];
	status?: ClothingItemStatus;
};

// Helper to parse array params from URL
function parseArrayParam(value: string | null): string[] | undefined {
	if (!value) {
		return;
	}
	const items = value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return items.length > 0 ? items : undefined;
}

export function useFilterParams() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Parse current filters from URL
	const statusParam = searchParams.get("status");

	const filters: FilterParams = {
		search: searchParams.get("search") || undefined,
		categories: parseArrayParam(searchParams.get("categories")),
		tags: parseArrayParam(searchParams.get("tags")),
		colors: parseArrayParam(searchParams.get("colors")),
		status:
			statusParam && isClothingItemStatus(statusParam)
				? statusParam
				: undefined,
	};

	// Update URL with new filters
	const setFilters = useCallback(
		(newFilters: FilterParams) => {
			const params = new URLSearchParams();

			// Add non-empty filters to URL
			if (newFilters.search) {
				params.set("search", newFilters.search);
			}

			if (newFilters.categories?.length) {
				params.set("categories", newFilters.categories.join(","));
			}

			if (newFilters.tags?.length) {
				params.set("tags", newFilters.tags.join(","));
			}

			if (newFilters.colors?.length) {
				params.set("colors", newFilters.colors.join(","));
			}

			if (newFilters.status) {
				params.set("status", newFilters.status);
			}

			// Update URL (replaces current entry in history)
			const queryString = params.toString();
			const newPath = `${pathname}${queryString ? `?${queryString}` : ""}`;
			router.replace(
				newPath as unknown as Parameters<typeof router.replace>[0],
				{
					scroll: false,
				}
			);
		},
		[router, pathname]
	);

	// Clear all filters
	const clearFilters = useCallback(() => {
		router.replace(
			pathname as unknown as Parameters<typeof router.replace>[0],
			{ scroll: false }
		);
	}, [router, pathname]);

	// Check if any filters are active
	const hasActiveFilters = Boolean(
		filters.search ||
			filters.categories?.length ||
			filters.tags?.length ||
			filters.colors?.length ||
			filters.status
	);

	return {
		filters,
		setFilters,
		clearFilters,
		hasActiveFilters,
	};
}
