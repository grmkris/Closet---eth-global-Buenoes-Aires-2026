"use client";

import { Check, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ItemStatus =
	| "all"
	| "ready"
	| "analyzing"
	| "converting"
	| "queued"
	| "failed";

type StatusChipData = {
	value: ItemStatus;
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	count: number;
};

type StatusChipsMinimalProps = {
	statusCounts: Record<string, number>;
	activeStatus: string;
	onStatusChange: (status: string) => void;
};

export function StatusChipsMinimal({
	statusCounts,
	activeStatus,
	onStatusChange,
}: StatusChipsMinimalProps) {
	const chips: StatusChipData[] = [
		{ value: "all", label: "All", count: statusCounts.all || 0 },
		{
			value: "ready",
			label: "Ready",
			icon: Check,
			count: statusCounts.ready || 0,
		},
		{
			value: "analyzing",
			label: "Analyzing",
			icon: Loader2,
			count:
				(statusCounts.analyzing || 0) +
				(statusCounts.converting || 0) +
				(statusCounts.queued || 0),
		},
		{
			value: "failed",
			label: "Failed",
			icon: XCircle,
			count: statusCounts.failed || 0,
		},
	];

	// Hide chips with 0 count (except "All")
	const visibleChips = chips.filter(
		(chip) => chip.value === "all" || chip.count > 0
	);

	return (
		<div className="flex gap-2 overflow-x-auto pb-2">
			{visibleChips.map((chip) => {
				const Icon = chip.icon;
				const isActive = activeStatus === chip.value;

				return (
					<Button
						className={cn(
							"h-8 flex-shrink-0 gap-1.5 px-3 text-xs",
							isActive &&
								"bg-primary text-primary-foreground hover:bg-primary/90"
						)}
						key={chip.value}
						onClick={() => onStatusChange(chip.value)}
						size="sm"
						variant={isActive ? "default" : "outline"}
					>
						{Icon && <Icon className="h-3 w-3" />}
						<span>{chip.label}</span>
						{chip.count > 0 && (
							<Badge
								className="ml-1 h-4 min-w-[1rem] px-1 text-[10px]"
								variant={isActive ? "secondary" : "outline"}
							>
								{chip.count}
							</Badge>
						)}
					</Button>
				);
			})}
		</div>
	);
}
