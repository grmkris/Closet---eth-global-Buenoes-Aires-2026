import { UI_CONFIG } from "@ai-stilist/shared/constants";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Address } from "viem";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format wallet address to show prefix...suffix (e.g., 0x1234...5678)
 */
export function formatAddress(address: Address): string {
	const prefix = address.slice(0, UI_CONFIG.ADDRESS_PREFIX_LENGTH);
	const suffix = address.slice(-UI_CONFIG.ADDRESS_SUFFIX_LENGTH);
	return `${prefix}...${suffix}`;
}

/**
 * Format price in cents to dollar string (e.g., 1999 → "$19.99")
 */
export function formatPrice(cents: number): string {
	const dollars = cents / 100;
	return `$${dollars.toFixed(2)}`;
}

/**
 * Format date to relative time string (e.g., "in 3 days", "2 hours ago")
 */
export function formatRelativeDate(date: Date): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (Math.abs(diffDays) >= 1) {
		const days = Math.abs(diffDays);
		const unit = days === 1 ? "day" : "days";
		return diffDays > 0 ? `in ${days} ${unit}` : `${days} ${unit} ago`;
	}

	if (Math.abs(diffHours) >= 1) {
		const hours = Math.abs(diffHours);
		const unit = hours === 1 ? "hour" : "hours";
		return diffHours > 0 ? `in ${hours} ${unit}` : `${hours} ${unit} ago`;
	}

	if (Math.abs(diffMinutes) >= 1) {
		const minutes = Math.abs(diffMinutes);
		const unit = minutes === 1 ? "minute" : "minutes";
		return diffMinutes > 0 ? `in ${minutes} ${unit}` : `${minutes} ${unit} ago`;
	}

	return "just now";
}

/**
 * Format number to compact notation (e.g., 1234 → "1.2k", 1500000 → "1.5M")
 */
export function formatCompactNumber(value: number, decimals = 1): string {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(decimals)}M`;
	}
	if (value >= 1000) {
		return `${(value / 1000).toFixed(decimals)}k`;
	}
	return value.toFixed(decimals);
}
