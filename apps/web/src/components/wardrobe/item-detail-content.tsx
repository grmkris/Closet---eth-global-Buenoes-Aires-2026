import type { WardrobeItemDetails } from "@/utils/orpc-types";
import { ItemAnalysisInfo } from "./item-sections/item-analysis-info";
import { ItemCategories } from "./item-sections/item-categories";
import { ItemColors } from "./item-sections/item-colors";
import { ItemImage } from "./item-sections/item-image";
import { ItemStatus } from "./item-sections/item-status";
import { ItemTags } from "./item-sections/item-tags";

type ItemDetailContentProps = {
	item: WardrobeItemDetails;
	variant: "mobile" | "desktop";
};

export function ItemDetailContent({ item, variant }: ItemDetailContentProps) {
	const isMobile = variant === "mobile";

	return (
		<div className={isMobile ? "space-y-6 overflow-y-auto p-4" : "space-y-6"}>
			{/* Image Preview */}
			<ItemImage
				alt={item.categories[0]?.category?.displayName || "Clothing item"}
				imageUrl={item.imageUrl}
				processedImageUrl={item.processedImageUrl}
			/>

			{/* Status */}
			<ItemStatus status={item.status} />

			{/* Categories */}
			<ItemCategories categories={item.categories} />

			{/* Colors */}
			<ItemColors colors={item.colors} />

			{/* Tags */}
			<ItemTags tags={item.tags} />

			{/* Analysis info */}
			<ItemAnalysisInfo analysis={item.analysis} />
		</div>
	);
}
