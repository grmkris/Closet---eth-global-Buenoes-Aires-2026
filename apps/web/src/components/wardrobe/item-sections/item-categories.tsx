import { Badge } from "@/components/ui/badge";
import type { WardrobeItemDetails } from "@/utils/orpc-types";

type ItemCategoriesProps = {
	categories: WardrobeItemDetails["categories"];
};

export function ItemCategories({ categories }: ItemCategoriesProps) {
	if (categories.length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className="mb-2 font-semibold text-sm">Categories</h3>
			<div className="flex flex-wrap gap-2">
				{categories.map(({ category }) => (
					<Badge key={category.id} variant="secondary">
						{category.displayName}
					</Badge>
				))}
			</div>
		</div>
	);
}
