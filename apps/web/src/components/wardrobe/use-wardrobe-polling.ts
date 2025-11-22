"use client";

import { orpc } from "@/utils/orpc";
import { useEffect, useRef } from "react";

/**
 * Hook to poll wardrobe items for status updates
 * Uses smart polling: only polls when there are pending/processing items
 * Uses exponential backoff to reduce server load
 */
export function useWardrobePolling() {
	const { data, isLoading } = orpc.wardrobe.getItems.useQuery();
	const utils = orpc.useUtils();
	const intervalRef = useRef<ReturnType<typeof setInterval>>();
	const pollCountRef = useRef(0);

	useEffect(() => {
		// Clear any existing interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		// Check if there are any items being processed
		const hasActiveItems = data?.items.some(
			(item) => item.status === "pending" || item.status === "processing"
		);

		if (!hasActiveItems) {
			// Reset poll count when no active items
			pollCountRef.current = 0;
			return;
		}

		// Calculate polling interval with exponential backoff
		// Start at 2s, max out at 30s
		const baseInterval = 2000; // 2 seconds
		const maxInterval = 30000; // 30 seconds
		const interval = Math.min(
			baseInterval * Math.pow(1.5, pollCountRef.current),
			maxInterval
		);

		// Set up polling
		intervalRef.current = setInterval(() => {
			utils.wardrobe.getItems.invalidate();
			pollCountRef.current += 1;
		}, interval);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [data?.items, utils]);

	return {
		items: data?.items || [],
		isLoading,
		hasActiveItems: data?.items.some(
			(item) => item.status === "pending" || item.status === "processing"
		),
	};
}
