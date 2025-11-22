"use client";

import type { MyUIMessage } from "@ai-stilist/api/features/ai/message-type";
import type { ConversationId } from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	PromptInput,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "./chat-messages";
import { ConversationsPopover } from "./conversations-popover";
import { EmptyChat } from "./empty-chat";
import { useChatStream } from "./use-chat-stream";

type ChatProps = {
	conversationId?: ConversationId;
	initialMessages?: MyUIMessage[];
	initialPrompt?: string;
};

/**
 * Main Chat Component
 *
 * Features:
 * - Displays EmptyChat state for new conversations
 * - Shows ChatMessages with scrolling container for active conversations
 * - Integrates PromptInput from ai-elements for message input
 * - Manages URL state: /chat → /chat/[conversationId] on first message
 * - Uses ORPC streaming via useChatStream hook
 * - Supports initialPrompt to auto-send a message on mount
 */
export function Chat({
	conversationId,
	initialMessages,
	initialPrompt,
}: ChatProps) {
	// Track if initial prompt has been sent
	const initialPromptSent = useRef(false);

	// Generate stable conversation ID for new chats
	const normalizedConversationId = useMemo(
		() => conversationId || typeIdGenerator("conversation"),
		[conversationId]
	);

	// Initialize chat stream with stable conversationId
	const { messages, sendMessage, status } = useChatStream({
		conversationId: normalizedConversationId,
		initialMessages,
		onFinish: () => {
			// Could invalidate conversation list query here
		},
		onError: (error) => {
			toast.error(`Failed to send message: ${error.message}`);
		},
	});

	const handleSendMessage = (text: string) => {
		// Update URL if this is a new chat (without navigation/remount)
		if (!conversationId && messages.length === 0) {
			const newUrl = `/chat/${normalizedConversationId}`;
			window.history.replaceState({}, "", newUrl);
		}

		// Append user message to chat
		sendMessage({
			text,
		});
	};

	// Auto-send initial prompt if provided (only once)
	useEffect(() => {
		if (
			initialPrompt &&
			!initialPromptSent.current &&
			messages.length === 0 &&
			status !== "submitted" &&
			status !== "streaming"
		) {
			initialPromptSent.current = true;

			// Update URL to include conversation ID
			if (!conversationId) {
				const newUrl = `/chat/${normalizedConversationId}`;
				window.history.replaceState({}, "", newUrl);
			}

			// Send the initial prompt
			sendMessage({ text: initialPrompt });
		}
	}, [
		initialPrompt,
		messages.length,
		status,
		sendMessage,
		conversationId,
		normalizedConversationId,
	]);

	const isLoading = status === "submitted" || status === "streaming";

	return (
		<div className="relative flex h-full flex-col overflow-hidden">
			{/* New Chat Floating Button - only show when viewing a conversation */}
			{conversationId && (
				<Button
					asChild
					className="absolute top-4 right-4 z-10 shadow-lg"
					size="sm"
					type="button"
					variant="default"
				>
					<Link href="/chat">
						<Plus className="mr-2 h-4 w-4" />
						New Chat
					</Link>
				</Button>
			)}

			{/* Content area - show suggested prompts when empty, messages otherwise */}
			<div className="flex-1 overflow-hidden">
				{messages.length === 0 ? (
					<EmptyChat isLoading={isLoading} onSendMessage={handleSendMessage} />
				) : (
					<Conversation className="h-full">
						<ConversationContent>
							<ChatMessages isLoading={isLoading} messages={messages} />
						</ConversationContent>
						<ConversationScrollButton />
					</Conversation>
				)}
			</div>

			{/* Input area - always visible */}
			<div className="border-t bg-background">
				<div className="p-4">
					<PromptInput
						onSubmit={(message) => {
							if (message.text?.trim()) {
								handleSendMessage(message.text);
							}
						}}
					>
						<PromptInputTextarea
							autoFocus
							placeholder="Ask about your wardrobe, style, or outfit ideas..."
						/>
						<PromptInputTools>
							<ConversationsPopover />
							<PromptInputSubmit status={isLoading ? "streaming" : "ready"} />
						</PromptInputTools>
					</PromptInput>
				</div>
			</div>
		</div>
	);
}
