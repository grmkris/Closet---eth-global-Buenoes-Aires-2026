"use client";

import { useChat } from "@ai-sdk/react";
import type { MyUIMessage } from "@ai-stilist/api/features/ai/message-type";
import type { ConversationId } from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import { eventIteratorToStream } from "@orpc/client";
import type { ChatOnErrorCallback, ChatOnFinishCallback } from "ai";
import { client } from "@/utils/orpc";

export type UseChatStreamOptions = {
	conversationId?: ConversationId;
	initialMessages?: MyUIMessage[];
	onFinish?: ChatOnFinishCallback<MyUIMessage>;
	onError?: ChatOnErrorCallback;
};

/**
 * Chat stream hook that integrates ORPC streaming with AI SDK's useChat
 *
 * This hook:
 * 1. Uses AI SDK's useChat for state management
 * 2. Converts ORPC event iterator to AI SDK stream via eventIteratorToStream
 * 3. Automatically generates message IDs using TypeID
 * 4. Handles conversation creation and message persistence on the backend
 */
export function useChatStream({
	conversationId,
	initialMessages,
	onFinish,
	onError,
}: UseChatStreamOptions) {
	const chat = useChat<MyUIMessage>({
		id: conversationId,
		messages: initialMessages,
		onFinish,
		onError,
		generateId: () => typeIdGenerator("message"),
		transport: {
			async sendMessages(options) {
				// Convert ORPC event iterator to AI SDK stream
				// This is the critical integration point!
				return eventIteratorToStream(
					await client.ai.chat(
						{
							conversationId,
							message: options.messages.at(-1),
						},
						{ signal: options.abortSignal }
					)
				);
			},
			reconnectToStream() {
				throw new Error("Stream reconnection not supported");
			},
		},
	});

	return chat;
}
