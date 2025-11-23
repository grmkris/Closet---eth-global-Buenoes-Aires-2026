"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import type { FilterParams } from "@/hooks/use-filter-params";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UserTagsResponse } from "@/utils/orpc-types";
import { FilterSections } from "./filters/filter-sections";

type FilterDrawerProps = {
	tagData: UserTagsResponse | undefined;
	filters: FilterParams;
	handlers: {
		onSearchChange: (search: string | undefined) => void;
		onCategoryChange: (categories: string[]) => void;
		onColorChange: (colors: string[]) => void;
		onTagChange: (tags: string[]) => void;
		onClearFilters: () => void;
	};
	activeFilterCount: number;
	hasActiveFilters: boolean;
};

export function FilterDrawer({
	tagData,
	filters,
	handlers,
	activeFilterCount,
	hasActiveFilters,
}: FilterDrawerProps) {
	const isMobile = useIsMobile();

	const trigger = (
		<Button className="gap-2" size="sm" variant="outline">
			<SlidersHorizontal className="h-4 w-4" />
			<span>Filters</span>
			{activeFilterCount > 0 && (
				<span className="rounded-full bg-primary px-1.5 text-primary-foreground text-xs">
					{activeFilterCount}
				</span>
			)}
		</Button>
	);

	if (isMobile) {
		return (
			<Drawer>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent className="max-h-[85vh]">
					<DrawerHeader className="flex items-center justify-between">
						<DrawerTitle>Filters</DrawerTitle>
						{hasActiveFilters && (
							<Button
								onClick={handlers.onClearFilters}
								size="sm"
								variant="ghost"
							>
								Clear all
							</Button>
						)}
					</DrawerHeader>
					<div className="overflow-y-auto p-4">
						<FilterSections
							activeFilterCount={activeFilterCount}
							filters={filters}
							handlers={handlers}
							hasActiveFilters={hasActiveFilters}
							tagData={tagData}
						/>
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>Filters</DialogTitle>
						{hasActiveFilters && (
							<Button
								onClick={handlers.onClearFilters}
								size="sm"
								variant="ghost"
							>
								Clear all
							</Button>
						)}
					</div>
				</DialogHeader>
				<div className="max-h-[60vh] overflow-y-auto">
					<FilterSections
						activeFilterCount={activeFilterCount}
						filters={filters}
						handlers={handlers}
						hasActiveFilters={hasActiveFilters}
						tagData={tagData}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
