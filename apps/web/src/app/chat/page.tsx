"use client";

import { useSearchParams } from "next/navigation";
import { Chat } from "./_lib/chat";

/**
 * New AI Chat Page
 * Creates a new conversation on first message send
 * Supports ?prompt= query parameter for initial message
 */
export default function ChatPage() {
	const searchParams = useSearchParams();
	const initialPrompt = searchParams.get("prompt");

	return <Chat initialPrompt={initialPrompt || undefined} />;
}
