import { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import { z } from "zod";

export const ProcessImageJobSchema = z.object({
	itemId: ClothingItemId,
	imageKey: z.string(),
	userId: UserId,
});

export type ProcessImageJob = z.infer<typeof ProcessImageJobSchema>;
