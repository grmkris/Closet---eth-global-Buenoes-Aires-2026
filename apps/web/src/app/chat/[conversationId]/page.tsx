import type { ConversationId } from "@ai-stilist/shared/typeid";
import { ConversationPageClient } from "./_components/conversation-page-client";

type ConversationPageProps = {
	params: Promise<{
		conversationId: ConversationId;
	}>;
};

/**
 * Conversation Page (Server Component)
 * Unwraps params and delegates to Client Component
 */
export default async function ConversationPage({
	params,
}: ConversationPageProps) {
	const { conversationId } = await params;

	return <ConversationPageClient conversationId={conversationId} />;
}
