"use client";

import { Loader2 } from "lucide-react";

type ProcessingBannerProps = {
	processingCount: number;
	onTap?: () => void;
};

export function ProcessingBanner({
	processingCount,
	onTap,
}: ProcessingBannerProps) {
	if (processingCount === 0) {
		return null;
	}

	return (
		<button
			className="sticky top-0 z-10 w-full bg-blue-500/10 px-4 py-3 text-left transition-colors hover:bg-blue-500/20 active:bg-blue-500/30 dark:bg-blue-500/20 dark:hover:bg-blue-500/30"
			onClick={onTap}
			type="button"
		>
			<div className="flex items-center gap-3">
				<Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
				<span className="font-medium text-blue-900 text-sm dark:text-blue-100">
					{processingCount} {processingCount === 1 ? "item" : "items"}{" "}
					processing...
				</span>
			</div>
		</button>
	);
}
