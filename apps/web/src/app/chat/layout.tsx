"use client";

import type { ReactNode } from "react";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { ChatSidebar, SidebarToggle } from "./_lib/chat-sidebar";

export default function ChatLayout({ children }: { children: ReactNode }) {
	const { isOpen, isMobile } = useSidebarState();

	return (
		<div className="flex h-full">
			<ChatSidebar />
			<main className="relative flex h-full flex-1 flex-col">
				{/* Sidebar toggle button - position adapts to sidebar state */}
				<div
					className={`absolute top-4 z-10 transition-all duration-300 ${
						isOpen && !isMobile ? "left-[21rem]" : "left-4"
					}`}
				>
					<SidebarToggle />
				</div>
				{children}
			</main>
		</div>
	);
}
