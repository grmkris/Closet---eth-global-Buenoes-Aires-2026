"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type TagWithType = {
	tag: string;
	count: number;
	type: string;
	typeDisplay: string;
};

type TagFilterProps = {
	tags: TagWithType[];
	selected: string[];
	onChange: (selected: string[]) => void;
};

export function TagFilter({ tags, selected, onChange }: TagFilterProps) {
	const toggleTag = (tag: string) => {
		if (selected.includes(tag)) {
			onChange(selected.filter((t) => t !== tag));
		} else {
			onChange([...selected, tag]);
		}
	};

	// Group tags by type
	const tagsByType = tags.reduce(
		(acc, { tag, type, typeDisplay, count }) => {
			if (!acc[type]) {
				acc[type] = { display: typeDisplay, tags: [] };
			}
			acc[type].tags.push({ name: tag, count });
			return acc;
		},
		{} as Record<
			string,
			{ display: string; tags: Array<{ name: string; count: number }> }
		>
	);

	if (Object.keys(tagsByType).length === 0) {
		return null;
	}

	return (
		<div className="space-y-3">
			<Label className="text-xs">Tags</Label>
			{Object.entries(tagsByType).map(([type, { display, tags: tagList }]) => (
				<div className="space-y-2" key={type}>
					<p className="font-medium text-muted-foreground text-xs">{display}</p>
					<div className="flex flex-wrap gap-1">
						{tagList.map(({ name, count }) => (
							<Badge
								className="cursor-pointer text-xs"
								key={name}
								onClick={() => toggleTag(name)}
								variant={selected.includes(name) ? "default" : "outline"}
							>
								{name}
								<span className="ml-1 text-xs opacity-60">({count})</span>
							</Badge>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
