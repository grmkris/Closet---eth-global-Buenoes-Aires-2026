"use client";

import type { ReactNode } from "react";
import { ChatSidebar, SidebarToggle } from "./_lib/chat-sidebar";

export default function ChatLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-full">
			<ChatSidebar />
			<main className="relative flex h-full flex-1 flex-col">
				{/* Sidebar toggle button in top-left */}
				<div className="absolute top-4 left-4 z-10">
					<SidebarToggle />
				</div>
				{children}
			</main>
		</div>
	);
}
