import { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import { z } from "zod";

export const AnalyzeImageJobSchema = z.object({
	itemId: ClothingItemId,
	processedImageKey: z.string(), // WebP processed image key
	userId: UserId,
});

export type AnalyzeImageJob = z.infer<typeof AnalyzeImageJobSchema>;
