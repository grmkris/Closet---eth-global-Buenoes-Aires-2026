import { z } from "zod";

// Clothing item processing statuses
export const CLOTHING_ITEM_STATUSES = [
	"awaiting_upload",
	"queued",
	"processing_image",
	"analyzing",
	"completed",
	"failed",
] as const;
export const ClothingItemStatus = z.enum(CLOTHING_ITEM_STATUSES);
export type ClothingItemStatus = z.infer<typeof ClothingItemStatus>;

// Type guard for runtime validation
export function isClothingItemStatus(
	value: string
): value is ClothingItemStatus {
	return CLOTHING_ITEM_STATUSES.includes(value as ClothingItemStatus);
}
