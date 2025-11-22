import type { WardrobeItemDetails } from "@/utils/orpc-types";

/**
 * Group tags by their type display name
 */
export function groupTagsByType(
	tags: WardrobeItemDetails["tags"]
): Record<string, string[]> {
	return tags.reduce(
		(acc, { tag }) => {
			const typeName = tag.type.displayName;
			if (!acc[typeName]) {
				acc[typeName] = [];
			}
			acc[typeName].push(tag.name);
			return acc;
		},
		{} as Record<string, string[]>
	);
}

/**
 * Get badge variant based on item status
 */
export function getStatusVariant(
	status: string
): "outline" | "destructive" | "default" {
	if (status === "completed") {
		return "outline";
	}
	if (status === "failed") {
		return "destructive";
	}
	return "default";
}
