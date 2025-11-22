import { z } from "zod";

// Clothing item processing statuses
export const CLOTHING_ITEM_STATUSES = [
	"pending",
	"processing",
	"ready",
	"failed",
] as const;
export const ClothingItemStatus = z.enum(CLOTHING_ITEM_STATUSES);
export type ClothingItemStatus = z.infer<typeof ClothingItemStatus>;
