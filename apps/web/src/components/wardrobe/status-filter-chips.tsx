"use client";

import type { ClothingItemStatus } from "@ai-stilist/shared/wardrobe-types";
import { AlertCircle, Check, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusFilterChipsProps = {
	selected: ClothingItemStatus | "all";
	onSelect: (status: ClothingItemStatus | "all") => void;
	counts?: {
		all: number;
		pending: number;
		processing: number;
		ready: number;
		failed: number;
	};
};

const STATUS_OPTIONS = [
	{ value: "all" as const, label: "All", icon: null },
	{ value: "ready" as const, label: "Ready", icon: Check },
	{ value: "processing" as const, label: "Processing", icon: Loader2 },
	{ value: "pending" as const, label: "Pending", icon: Clock },
	{ value: "failed" as const, label: "Failed", icon: AlertCircle },
];

export function StatusFilterChips({
	selected,
	onSelect,
	counts,
}: StatusFilterChipsProps) {
	return (
		<div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
			{STATUS_OPTIONS.map(({ value, label, icon: Icon }) => {
				const isSelected = selected === value;
				const count = counts?.[value] || 0;

				// Don't show empty statuses except "all"
				if (value !== "all" && count === 0) {
					return null;
				}

				return (
					<button
						className={cn(
							"flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 font-medium text-sm transition-all",
							isSelected
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-background hover:bg-muted"
						)}
						key={value}
						onClick={() => onSelect(value)}
						type="button"
					>
						{Icon && (
							<Icon
								className={cn(
									"h-3.5 w-3.5",
									value === "processing" && "animate-spin"
								)}
							/>
						)}
						<span>{label}</span>
						{count > 0 && (
							<Badge
								className={cn(
									"ml-1 h-5 min-w-5 px-1.5 text-xs",
									isSelected
										? "bg-primary-foreground text-primary"
										: "bg-muted text-muted-foreground"
								)}
								variant="secondary"
							>
								{count}
							</Badge>
						)}
					</button>
				);
			})}
		</div>
	);
}
