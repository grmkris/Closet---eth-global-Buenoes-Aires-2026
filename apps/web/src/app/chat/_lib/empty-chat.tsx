"use client";

import { MessageSquare } from "lucide-react";
import { AiCapabilities } from "./ai-capabilities";

type EmptyChatProps = {
	onSendMessage?: (message: string) => void;
	isLoading?: boolean;
};

/**
 * Empty Chat Component
 * Displays AI capabilities showcase for new conversations
 */
export function EmptyChat({
	onSendMessage,
	isLoading: _isLoading = false,
}: EmptyChatProps) {
	return (
		<div className="flex h-full flex-col justify-center overflow-y-auto px-4 py-6">
			{/* Hero Section */}
			<div className="mb-8 flex flex-col items-center justify-center text-center">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<MessageSquare className="h-6 w-6 text-primary" />
				</div>
				<h1 className="font-bold text-2xl">AI Style Assistant</h1>
				<p className="mt-2 text-muted-foreground">
					Ask me anything about your wardrobe, style, or outfit suggestions
				</p>
			</div>

			{/* AI Capabilities */}
			<div className="w-full max-w-5xl self-center">
				<AiCapabilities
					onSelectCapability={(_capability) => {
						// TODO: Implement capability selection handling
					}}
					onSelectPrompt={(prompt) => {
						onSendMessage?.(prompt);
					}}
				/>
			</div>
		</div>
	);
}
