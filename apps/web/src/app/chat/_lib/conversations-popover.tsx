"use client";

import { useQuery } from "@tanstack/react-query";
import { History, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const SKELETON_COUNT = 5;
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`
);

/**
 * ConversationsPopover Component
 * Displays recent conversations in a popover near the input area
 */
export function ConversationsPopover() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	const { data, isLoading, error } = useQuery(
		orpc.ai.listConversations.queryOptions({
			input: {
				page: 1,
				limit: 8,
			},
			queryOptions: {
				enabled: open,
			},
		})
	);

	// Get current conversation ID from URL
	const currentConversationId = pathname?.includes("/chat/")
		? pathname.split("/chat/")[1]
		: null;

	return (
		<Drawer onOpenChange={setOpen} open={open}>
			<DrawerTrigger asChild>
				<Button
					size="icon"
					title="Recent conversations"
					type="button"
					variant="ghost"
				>
					<History className="h-4 w-4" />
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Recent Conversations</DrawerTitle>
					<p className="text-muted-foreground text-sm">
						Continue where you left off
					</p>
				</DrawerHeader>

				<ScrollArea className="h-96">
					{isLoading && (
						<div className="space-y-2 p-3">
							{SKELETON_KEYS.map((key) => (
								<Skeleton className="h-14 w-full" key={key} />
							))}
						</div>
					)}

					{error && (
						<div className="p-6 text-center">
							<p className="text-muted-foreground text-sm">
								Failed to load conversations
							</p>
						</div>
					)}

					{!(isLoading || error) &&
						(!data?.conversations || data.conversations.length === 0) && (
							<div className="p-6 text-center">
								<MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
								<p className="text-muted-foreground text-sm">
									No conversations yet
								</p>
							</div>
						)}

					{data?.conversations && data.conversations.length > 0 && (
						<div className="space-y-1 p-2">
							{data.conversations.map((conversation) => {
								const isActive = currentConversationId === conversation.id;
								const displayTitle =
									conversation.title || "Untitled conversation";
								const timeAgo = new Date(
									conversation.updatedAt
								).toLocaleDateString();

								return (
									<Link
										className={`flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-accent ${
											isActive ? "bg-accent" : ""
										}`}
										href={`/chat/${conversation.id}`}
										key={conversation.id}
										onClick={() => setOpen(false)}
									>
										<MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-sm leading-tight">
												{displayTitle}
											</p>
											<p className="text-muted-foreground text-xs">{timeAgo}</p>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</ScrollArea>
			</DrawerContent>
		</Drawer>
	);
}
