"use client";

import type { ConversationId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";
import { Chat } from "../../_lib/chat";

type ConversationPageClientProps = {
	conversationId: ConversationId;
};

/**
 * Client Component for Conversation Page
 * Handles data fetching and interactive chat interface
 */
export function ConversationPageClient({
	conversationId,
}: ConversationPageClientProps) {
	const { data, isLoading, error } = useQuery(
		orpc.ai.loadConversation.queryOptions({
			input: { conversationId },
		})
	);

	if (isLoading) {
		return <Skeleton className="h-full w-full" />;
	}

	if (error) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<h2 className="mb-2 font-semibold text-lg">
						Failed to load conversation
					</h2>
					<p className="text-muted-foreground text-sm">{error.message}</p>
				</div>
			</div>
		);
	}

	return (
		<Chat
			conversationId={conversationId}
			initialMessages={data?.messages ?? []}
		/>
	);
}
