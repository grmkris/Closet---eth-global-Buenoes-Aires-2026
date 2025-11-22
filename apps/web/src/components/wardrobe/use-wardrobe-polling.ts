"use client";

import { POLLING_CONFIG } from "@ai-stilist/shared/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { orpc } from "@/utils/orpc";

/**
 * Hook to poll wardrobe items for status updates
 * Uses smart polling: only polls when there are pending/processing items
 * Uses exponential backoff to reduce server load
 */
export function useWardrobePolling() {
	const { data, isLoading } = useQuery(
		orpc.wardrobe.getItems.queryOptions({ input: {} })
	);
	const queryClient = useQueryClient();
	const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
		undefined
	);
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
		const interval = Math.min(
			POLLING_CONFIG.BASE_INTERVAL_MS *
				POLLING_CONFIG.BACKOFF_MULTIPLIER ** pollCountRef.current,
			POLLING_CONFIG.MAX_INTERVAL_MS
		);

		// Set up polling
		intervalRef.current = setInterval(() => {
			queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});
			pollCountRef.current += 1;
		}, interval);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [data?.items, queryClient]);

	return {
		items: data?.items || [],
		isLoading,
		hasActiveItems: data?.items.some(
			(item) => item.status === "pending" || item.status === "processing"
		),
	};
}
