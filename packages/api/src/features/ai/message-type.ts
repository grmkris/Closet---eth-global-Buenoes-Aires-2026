import type {
	InferUITools,
	JSONValue,
	UIMessage,
	UIMessagePart,
} from "@ai-stilist/ai";
import { z } from "zod";
import type { AiTools } from "./ai-tools";

export const dataPartSchema = z.object({});
export const metadataSchema = z.object({});

export type MyDataPart = z.infer<typeof dataPartSchema>;
export type MyMetadata = z.infer<typeof metadataSchema>;

export type MyToolSet = InferUITools<AiTools>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart, MyToolSet>;
export type MyUIMessageMetadata = MyUIMessage["metadata"];

export type MyUIMessagePart = UIMessagePart<MyDataPart, MyToolSet>;

export type MyProviderMetadata = Record<string, Record<string, JSONValue>>;

// Individual tool types for type-safe rendering
export type SearchWardrobeTool = MyToolSet["searchWardrobe"];
export type GetWardrobeSummaryTool = MyToolSet["getWardrobeSummary"];
export type GetItemDetailsTool = MyToolSet["getItemDetails"];
export type ShowItemsTool = MyToolSet["showItems"];
export type GenerateOutfitPreviewTool = MyToolSet["generateOutfitPreview"];

// Extract input/output types for each tool
export type SearchWardrobeInput = SearchWardrobeTool["input"];
export type SearchWardrobeOutput = SearchWardrobeTool["output"];

export type GetWardrobeSummaryInput = GetWardrobeSummaryTool["input"];
export type GetWardrobeSummaryOutput = GetWardrobeSummaryTool["output"];

export type GetItemDetailsInput = GetItemDetailsTool["input"];
export type GetItemDetailsOutput = GetItemDetailsTool["output"];

export type ShowItemsInput = ShowItemsTool["input"];
export type ShowItemsOutput = ShowItemsTool["output"];

export type GenerateOutfitPreviewInput = GenerateOutfitPreviewTool["input"];
export type GenerateOutfitPreviewOutput = GenerateOutfitPreviewTool["output"];
