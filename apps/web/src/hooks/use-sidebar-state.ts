"use client";

import { SCREEN_SIZE } from "@ai-stilist/shared/constants";
import { useEffect, useState } from "react";
import { useIsMobile } from "./use-is-mobile";

const STORAGE_KEY = "chat-sidebar-open";

export function useSidebarState() {
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		// Default: true for desktop, false for mobile
		if (typeof window === "undefined") {
			return true;
		}

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored !== null) {
				return stored === "true";
			}
		} catch {
			// localStorage might not be available
		}

		// Default based on screen size
		return window.innerWidth >= SCREEN_SIZE.DESKTOP;
	});

	// Persist state to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, String(isOpen));
		} catch {
			// Ignore localStorage errors
		}
	}, [isOpen]);

	// Auto-close on mobile when switching from desktop
	useEffect(() => {
		if (isMobile && isOpen) {
			setIsOpen(false);
		}
	}, [isMobile, isOpen]);

	const toggle = () => setIsOpen((prev) => !prev);
	const open = () => setIsOpen(true);
	const close = () => setIsOpen(false);

	return {
		isOpen,
		setIsOpen,
		toggle,
		open,
		close,
		isMobile,
	};
}
