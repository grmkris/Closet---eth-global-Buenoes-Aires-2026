"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterPanelHeaderProps = {
	isExpanded: boolean;
	hasActiveFilters: boolean;
	activeFilterCount: number;
	onToggleExpanded: () => void;
	onClear: () => void;
};

export function FilterPanelHeader({
	isExpanded,
	hasActiveFilters,
	activeFilterCount,
	onToggleExpanded,
	onClear,
}: FilterPanelHeaderProps) {
	return (
		<button
			className="flex w-full items-center justify-between py-2 text-left"
			onClick={onToggleExpanded}
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
	);
}
