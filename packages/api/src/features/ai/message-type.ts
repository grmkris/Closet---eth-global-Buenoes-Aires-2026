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
