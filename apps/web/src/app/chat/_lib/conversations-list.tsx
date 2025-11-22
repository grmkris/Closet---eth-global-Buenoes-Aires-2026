"use client";

import type { ConversationId } from "@ai-stilist/shared/typeid";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const DAYS_IN_WEEK = 7;
const SKELETON_COUNT = 3;
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`
);

type ConversationListItem = {
	id: ConversationId;
	title: string | null;
	model: string;
	createdAt: Date;
	updatedAt: Date;
	lastMessageAt?: Date;
};

type ConversationsListProps = {
	variant?: "sidebar" | "page";
	limit?: number;
};

type GroupedConversations = {
	today: ConversationListItem[];
	yesterday: ConversationListItem[];
	lastWeek: ConversationListItem[];
	older: ConversationListItem[];
};

/**
 * Individual conversation item
 */
function ConversationItem({
	conversation,
	currentConversationId,
}: {
	conversation: ConversationListItem;
	currentConversationId: string | null;
}) {
	const isActive = currentConversationId === conversation.id;
	const displayTitle = conversation.title || "Untitled conversation";
	const timeAgo = new Date(conversation.updatedAt).toLocaleDateString();

	return (
		<Link
			className={`group relative flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-accent ${
				isActive ? "bg-accent" : ""
			}`}
			href={`/chat/${conversation.id}`}
		>
			<MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm leading-tight">
					{displayTitle}
				</p>
				<p className="text-muted-foreground text-xs">{timeAgo}</p>
			</div>
			<Button
				className="opacity-0 group-hover:opacity-100"
				onClick={(e) => {
					e.preventDefault();
					// TODO: Implement delete functionality
				}}
				size="icon"
				type="button"
				variant="ghost"
			>
				<Trash2 className="h-3 w-3" />
			</Button>
		</Link>
	);
}

/**
 * Group section component
 */
function GroupSection({
	title,
	conversations,
	currentConversationId,
}: {
	title: string;
	conversations: ConversationListItem[];
	currentConversationId: string | null;
}) {
	if (conversations.length === 0) {
		return null;
	}

	return (
		<div className="space-y-1">
			<p className="px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{title}
			</p>
			<div className="space-y-0.5">
				{conversations.map((conv) => (
					<ConversationItem
						conversation={conv}
						currentConversationId={currentConversationId}
						key={conv.id}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * ConversationsList Component
 * Displays list of AI conversations with time grouping
 * Can be used in sidebar or as standalone list
 */
export function ConversationsList({
	variant = "sidebar",
	limit = 20,
}: ConversationsListProps) {
	const pathname = usePathname();

	const { data, isLoading, error } = useQuery(
		orpc.ai.listConversations.queryOptions({
			input: {
				page: 1,
				limit,
			},
		})
	);

	// Get current conversation ID from URL
	const currentConversationId: string | null = pathname?.includes("/chat/")
		? (pathname.split("/chat/")[1] ?? null)
		: null;

	// Group conversations by time
	const groupConversations = (
		conversations: ConversationListItem[]
	): GroupedConversations => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const lastWeek = new Date(today);
		lastWeek.setDate(lastWeek.getDate() - DAYS_IN_WEEK);

		const groups: GroupedConversations = {
			today: [],
			yesterday: [],
			lastWeek: [],
			older: [],
		};

		for (const conv of conversations) {
			const convDate = new Date(conv.updatedAt);
			if (convDate >= today) {
				groups.today.push(conv);
			} else if (convDate >= yesterday) {
				groups.yesterday.push(conv);
			} else if (convDate >= lastWeek) {
				groups.lastWeek.push(conv);
			} else {
				groups.older.push(conv);
			}
		}

		return groups;
	};

	if (isLoading) {
		return (
			<div className="space-y-2">
				{SKELETON_KEYS.map((key) => (
					<Skeleton className="h-14 w-full" key={key} />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center">
				<p className="text-muted-foreground text-sm">
					Failed to load conversations
				</p>
			</div>
		);
	}

	if (!data?.conversations || data.conversations.length === 0) {
		return (
			<div className="p-4 text-center">
				<MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
				<p className="text-muted-foreground text-sm">No conversations yet</p>
			</div>
		);
	}

	const groupedConversations = groupConversations(data.conversations);

	return (
		<div className="space-y-4">
			{variant === "page" && (
				<h2 className="font-semibold text-lg">Recent Conversations</h2>
			)}

			<div className="space-y-4">
				<GroupSection
					conversations={groupedConversations.today}
					currentConversationId={currentConversationId}
					title="Today"
				/>
				<GroupSection
					conversations={groupedConversations.yesterday}
					currentConversationId={currentConversationId}
					title="Yesterday"
				/>
				<GroupSection
					conversations={groupedConversations.lastWeek}
					currentConversationId={currentConversationId}
					title="Last Week"
				/>
				<GroupSection
					conversations={groupedConversations.older}
					currentConversationId={currentConversationId}
					title="Older"
				/>
			</div>
		</div>
	);
}
