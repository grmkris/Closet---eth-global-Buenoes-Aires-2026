"use client";

import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { ConversationsList } from "./conversations-list";

export function ChatSidebar() {
	const { isOpen, setIsOpen, close, isMobile } = useSidebarState();

	// Mobile: Drawer overlay
	if (isMobile) {
		return (
			<Drawer direction="left" onOpenChange={setIsOpen} open={isOpen}>
				<DrawerContent className="h-full w-80">
					<DrawerHeader className="p-4">
						<DrawerTitle className="sr-only">Conversations</DrawerTitle>
						<Link href="/chat" onClick={close}>
							<Button className="w-full justify-start gap-2" variant="default">
								<MessageSquarePlus className="h-4 w-4" />
								New Chat
							</Button>
						</Link>
					</DrawerHeader>
					<Separator />
					<ScrollArea className="flex-1 px-2">
						<ConversationsList limit={50} variant="sidebar" />
					</ScrollArea>
				</DrawerContent>
			</Drawer>
		);
	}

	// Desktop: Persistent sidebar
	return (
		<aside
			className={`relative flex h-full flex-col border-r bg-background transition-all duration-300 ${
				isOpen ? "w-80" : "w-0"
			}`}
		>
			{isOpen && (
				<>
					<div className="flex items-center justify-between p-4">
						<Link className="flex-1" href="/chat">
							<Button
								className="w-full justify-start gap-2"
								size="default"
								variant="default"
							>
								<MessageSquarePlus className="h-4 w-4" />
								New Chat
							</Button>
						</Link>
					</div>
					<Separator />
					<ScrollArea className="flex-1 px-2 py-4">
						<ConversationsList limit={50} variant="sidebar" />
					</ScrollArea>
				</>
			)}
		</aside>
	);
}

/**
 * Sidebar toggle button - placed in chat header/navbar
 */
export function SidebarToggle() {
	const { isOpen, toggle } = useSidebarState();

	return (
		<Button onClick={toggle} size="icon" type="button" variant="ghost">
			{isOpen ? (
				<PanelLeftClose className="h-5 w-5" />
			) : (
				<PanelLeftOpen className="h-5 w-5" />
			)}
			<span className="sr-only">Toggle sidebar</span>
		</Button>
	);
}
