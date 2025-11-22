"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

type SearchFilterProps = {
	value?: string;
	onChange: (value: string | undefined) => void;
};

export function SearchFilter({ value, onChange }: SearchFilterProps) {
	const [searchInput, setSearchInput] = useState(value || "");
	const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

	// Update parent when debounced value changes
	useEffect(() => {
		onChange(debouncedSearch || undefined);
	}, [debouncedSearch, onChange]);

	// Sync with external changes (e.g., URL changes from browser back/forward)
	useEffect(() => {
		setSearchInput(value || "");
	}, [value]);

	return (
		<div className="space-y-2">
			<Label className="text-xs" htmlFor="search">
				Search
			</Label>
			<div className="relative">
				<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
				<Input
					className="pl-8"
					id="search"
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder="Search items..."
					value={searchInput}
				/>
			</div>
		</div>
	);
}
