"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type CategoryFilterProps = {
	categories: string[];
	selected: string[];
	onChange: (selected: string[]) => void;
};

export function CategoryFilter({
	categories,
	selected,
	onChange,
}: CategoryFilterProps) {
	const toggleCategory = (category: string) => {
		if (selected.includes(category)) {
			onChange(selected.filter((c) => c !== category));
		} else {
			onChange([...selected, category]);
		}
	};

	if (categories.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			<Label className="text-xs">Categories</Label>
			<div className="flex flex-wrap gap-2">
				{categories.map((category) => (
					<Badge
						className="cursor-pointer capitalize"
						key={category}
						onClick={() => toggleCategory(category)}
						variant={selected.includes(category) ? "default" : "outline"}
					>
						{category}
					</Badge>
				))}
			</div>
		</div>
	);
}
