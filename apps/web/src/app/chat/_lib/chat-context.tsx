"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { MyUIMessage } from "@ai-stilist/api/features/ai/message-type";
import { createContext, useContext } from "react";

export type ChatContextValue = Pick<
	UseChatHelpers<MyUIMessage>,
	"addToolOutput"
>;

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error("useChatContext must be used within ChatContext.Provider");
	}
	return context;
}
