"use client";

import type { MyUIMessage } from "@ai-stilist/api/features/ai/message-type";
import { MessageId } from "@ai-stilist/shared/typeid";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ToolPartRenderer } from "./tool-renderers/registry";
import { isToolPart } from "./tool-renderers/types";

type ChatMessagesProps = {
	messages: MyUIMessage[];
	isLoading?: boolean;
};

/**
 * Chat Messages Component
 * Renders the list of messages in the conversation
 * Uses Message components from ai-elements
 */
export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
	if (messages.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4">
			{messages.map((message, messageIndex) => {
				// Extract text content from message parts
				const textParts = message.parts.filter((part) => part.type === "text");
				const toolParts = message.parts.filter((part) => isToolPart(part));

				const textContent = textParts
					.map((part) => (part.type === "text" ? part.text : ""))
					.join("\n");

				const isLatest = messageIndex === messages.length - 1;

				return (
					<Message from={message.role} key={message.id}>
						<Avatar className="h-8 w-8">
							<AvatarFallback>
								{message.role === "user" ? "U" : "AI"}
							</AvatarFallback>
						</Avatar>
						<MessageContent>
							{textContent && <MessageResponse>{textContent}</MessageResponse>}
							{/* Render tool calls and results */}
							{toolParts.map((part, partIndex) => (
								<ToolPartRenderer
									isLatest={isLatest}
									key={`${message.id}-tool-${partIndex}`}
									messageId={MessageId.parse(message.id)}
									part={part}
								/>
							))}
						</MessageContent>
					</Message>
				);
			})}

			{/* Loading indicator */}
			{isLoading && (
				<Message from="assistant">
					<Avatar className="h-8 w-8">
						<AvatarFallback>AI</AvatarFallback>
					</Avatar>
					<MessageContent>
						<div className="flex items-center gap-2">
							<div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
							<div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
							<div className="h-2 w-2 animate-bounce rounded-full bg-current" />
						</div>
					</MessageContent>
				</Message>
			)}
		</div>
	);
}
