"use client";

import type { ConversationId } from "@ai-stilist/shared/typeid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { client, orpc } from "@/utils/orpc";

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
	onDelete,
	onRename,
}: {
	conversation: ConversationListItem;
	currentConversationId: string | null;
	onDelete: (id: ConversationId) => void;
	onRename: (id: ConversationId, currentTitle: string | null) => void;
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
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
				<Button
					onClick={(e) => {
						e.preventDefault();
						onRename(conversation.id, conversation.title);
					}}
					size="icon"
					type="button"
					variant="ghost"
				>
					<Pencil className="h-3 w-3" />
				</Button>
				<Button
					onClick={(e) => {
						e.preventDefault();
						onDelete(conversation.id);
					}}
					size="icon"
					type="button"
					variant="ghost"
				>
					<Trash2 className="h-3 w-3" />
				</Button>
			</div>
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
	onDelete,
	onRename,
}: {
	title: string;
	conversations: ConversationListItem[];
	currentConversationId: string | null;
	onDelete: (id: ConversationId) => void;
	onRename: (id: ConversationId, currentTitle: string | null) => void;
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
						onDelete={onDelete}
						onRename={onRename}
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
	const router = useRouter();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState<{
		id: ConversationId;
		title: string | null;
	} | null>(null);
	const [renameValue, setRenameValue] = useState("");

	const { data, isLoading, error } = useQuery(
		orpc.ai.listConversations.queryOptions({
			input: {
				page: 1,
				limit,
			},
		})
	);

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: async (conversationId: ConversationId) => {
			await client.ai.deleteConversation({ conversationId });
		},
		onSuccess: (_, conversationId) => {
			toast.success("Conversation deleted");
			queryClient.invalidateQueries({ queryKey: ["ai", "listConversations"] });

			// Navigate away if deleting current conversation
			if (currentConversationId === conversationId) {
				router.push("/chat");
			}
		},
		onError: () => {
			toast.error("Failed to delete conversation");
		},
	});

	// Rename mutation
	const renameMutation = useMutation({
		mutationFn: async ({
			conversationId,
			title,
		}: {
			conversationId: ConversationId;
			title: string;
		}) => {
			await client.ai.renameConversation({ conversationId, title });
		},
		onSuccess: () => {
			toast.success("Conversation renamed");
			queryClient.invalidateQueries({ queryKey: ["ai", "listConversations"] });
			setRenameDialogOpen(false);
		},
		onError: () => {
			toast.error("Failed to rename conversation");
		},
	});

	// Get current conversation ID from URL
	const currentConversationId: string | null = pathname?.includes("/chat/")
		? (pathname.split("/chat/")[1] ?? null)
		: null;

	// Group conversations by time
	const groupConversations = (
		conversationsToGroup: ConversationListItem[]
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

		for (const conv of conversationsToGroup) {
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

	// Filter conversations based on search query
	const filterConversations = (
		conversationsToFilter: ConversationListItem[]
	): ConversationListItem[] => {
		if (!searchQuery.trim()) {
			return conversationsToFilter;
		}

		const query = searchQuery.toLowerCase();
		return conversationsToFilter.filter((conv) =>
			(conv.title || "untitled conversation").toLowerCase().includes(query)
		);
	};

	// Handle delete click
	const handleDeleteClick = (id: ConversationId) => {
		setSelectedConversation({ id, title: null });
		setDeleteDialogOpen(true);
	};

	// Handle rename click
	const handleRenameClick = (
		id: ConversationId,
		currentTitle: string | null
	) => {
		setSelectedConversation({ id, title: currentTitle });
		setRenameValue(currentTitle || "");
		setRenameDialogOpen(true);
	};

	// Confirm delete
	const confirmDelete = () => {
		if (selectedConversation) {
			deleteMutation.mutate(selectedConversation.id);
			setDeleteDialogOpen(false);
		}
	};

	// Confirm rename
	const confirmRename = () => {
		if (selectedConversation && renameValue.trim()) {
			renameMutation.mutate({
				conversationId: selectedConversation.id,
				title: renameValue.trim(),
			});
		}
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

	const conversationsToDisplay = data?.conversations || [];
	const filteredConversations = filterConversations(conversationsToDisplay);

	if (conversationsToDisplay.length === 0) {
		return (
			<div className="p-4 text-center">
				<MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
				<p className="text-muted-foreground text-sm">No conversations yet</p>
			</div>
		);
	}

	const groupedConversations = groupConversations(conversationsToDisplay);

	return (
		<>
			<div className="space-y-4">
				{variant === "sidebar" && (
					<div className="relative px-2">
						<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 h-4 w-4 text-muted-foreground" />
						<Input
							className="pl-8"
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search conversations..."
							type="search"
							value={searchQuery}
						/>
					</div>
				)}

				{variant === "page" && (
					<h2 className="font-semibold text-lg">Recent Conversations</h2>
				)}

				{filteredConversations.length === 0 ? (
					<div className="p-4 text-center">
						<p className="text-muted-foreground text-sm">
							No conversations found
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<GroupSection
							conversations={groupedConversations.today}
							currentConversationId={currentConversationId}
							onDelete={handleDeleteClick}
							onRename={handleRenameClick}
							title="Today"
						/>
						<GroupSection
							conversations={groupedConversations.yesterday}
							currentConversationId={currentConversationId}
							onDelete={handleDeleteClick}
							onRename={handleRenameClick}
							title="Yesterday"
						/>
						<GroupSection
							conversations={groupedConversations.lastWeek}
							currentConversationId={currentConversationId}
							onDelete={handleDeleteClick}
							onRename={handleRenameClick}
							title="Last Week"
						/>
						<GroupSection
							conversations={groupedConversations.older}
							currentConversationId={currentConversationId}
							onDelete={handleDeleteClick}
							onRename={handleRenameClick}
							title="Older"
						/>
					</div>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Conversation?</DialogTitle>
						<DialogDescription>
							This will permanently delete this conversation and all its
							messages. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => setDeleteDialogOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={deleteMutation.isPending}
							onClick={confirmDelete}
							type="button"
							variant="destructive"
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename Dialog */}
			<Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename Conversation</DialogTitle>
						<DialogDescription>
							Enter a new title for this conversation.
						</DialogDescription>
					</DialogHeader>
					<Input
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								confirmRename();
							}
						}}
						placeholder="Conversation title"
						value={renameValue}
					/>
					<DialogFooter>
						<Button
							onClick={() => setRenameDialogOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={renameMutation.isPending || !renameValue.trim()}
							onClick={confirmRename}
							type="button"
						>
							{renameMutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
