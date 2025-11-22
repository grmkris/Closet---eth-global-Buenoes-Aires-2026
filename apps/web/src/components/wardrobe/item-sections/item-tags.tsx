import { Badge } from "@/components/ui/badge";
import type { WardrobeItemDetails } from "@/utils/orpc-types";
import { groupTagsByType } from "../item-detail-dialog-helpers";

type ItemTagsProps = {
	tags: WardrobeItemDetails["tags"];
};

export function ItemTags({ tags }: ItemTagsProps) {
	const tagsByType = groupTagsByType(tags);

	if (Object.keys(tagsByType).length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className="mb-2 font-semibold text-sm">Tags</h3>
			<div className="space-y-3">
				{Object.entries(tagsByType).map(([typeName, tagNames]) => (
					<div key={typeName}>
						<p className="mb-1 text-muted-foreground text-xs">{typeName}</p>
						<div className="flex flex-wrap gap-1">
							{tagNames.map((tagName) => (
								<Badge className="text-xs" key={tagName} variant="outline">
									{tagName}
								</Badge>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
