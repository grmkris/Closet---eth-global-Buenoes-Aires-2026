"use client";

import type { ConversationId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { client } from "@/utils/orpc";
import { Chat } from "../_lib/chat";

type ConversationPageProps = {
	params: {
		conversationId: ConversationId;
	};
};

/**
 * Existing Conversation Page
 * Loads conversation data and displays chat interface
 */
export default function ConversationPage({ params }: ConversationPageProps) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["conversation", params.conversationId],
		queryFn: async () =>
			client.ai.loadConversation({
				conversationId: params.conversationId,
			}),
	});

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
			conversationId={params.conversationId}
			initialMessages={data?.messages ?? []}
		/>
	);
}
