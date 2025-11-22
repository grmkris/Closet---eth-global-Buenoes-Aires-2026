"use client";

import { CheckCircle, ShirtIcon, Sparkles } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for showItems tool
 * Displays selected clothing items in a clean grid layout
 */
export function ShowItemsRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "showItems");

	// Only render for successful results
	if (status !== "success" || !output?.items) {
		return null;
	}

	const { items, displayedCount, notFound } = output;

	if (items.length === 0) {
		return (
			<div className="my-3 rounded-lg border bg-card">
				<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
					<Sparkles className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium text-sm">Items</span>
					<Badge className="ml-auto" variant="secondary">
						Not found
					</Badge>
				</div>
				<div className="p-6 text-center text-muted-foreground text-sm">
					{notFound && notFound.length > 0
						? "Some items could not be found"
						: "No items to display"}
				</div>
			</div>
		);
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card">
			{/* Header */}
			<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
				<Sparkles className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium text-sm">Suggested Items</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-primary" />
					{displayedCount} item{displayedCount !== 1 ? "s" : ""}
				</Badge>
			</div>

			{/* Grid of items */}
			<div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
				{items.map((item) => (
					<div
						className="overflow-hidden rounded-md border bg-background transition-shadow hover:shadow-md"
						key={item.id}
					>
						{/* Thumbnail */}
						<div className="relative aspect-square bg-muted/10">
							{item.thumbnailUrl ? (
								<Image
									alt={item.categories.join(", ")}
									className="object-cover"
									fill
									sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
									src={item.thumbnailUrl}
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<ShirtIcon className="h-12 w-12 text-muted-foreground/30" />
								</div>
							)}
						</div>

						{/* Metadata */}
						<div className="space-y-1 p-2">
							{/* Categories */}
							<div className="font-medium text-xs">
								{item.categories.join(", ") || "Unknown"}
							</div>

							{/* Colors */}
							{item.colors.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{item.colors.map((color, idx) => (
										<div
											className="flex items-center gap-1"
											key={`${color.name}-${idx}`}
										>
											{color.hex && (
												<div
													className="h-3 w-3 rounded-full border"
													style={{ backgroundColor: color.hex }}
													title={color.name}
												/>
											)}
											{idx === 0 && (
												<span className="text-muted-foreground text-xs">
													{color.name}
												</span>
											)}
										</div>
									))}
								</div>
							)}

							{/* Tags by type (show first type only to save space) */}
							{Object.entries(item.tagsByType).length > 0 && (
								<div className="flex flex-wrap gap-1">
									{Object.entries(item.tagsByType)
										.slice(0, 1)
										.map(([type, tags]) => (
											<Badge className="text-xs" key={type} variant="outline">
												{tags[0]}
											</Badge>
										))}
									{Object.keys(item.tagsByType).length > 1 && (
										<Badge className="text-xs" variant="outline">
											+{Object.keys(item.tagsByType).length - 1}
										</Badge>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Footer note if some items were not found */}
			{notFound && notFound.length > 0 && (
				<div className="border-t bg-muted/30 px-3 py-2">
					<p className="text-muted-foreground text-xs">
						Note: {notFound.length} item
						{notFound.length !== 1 ? "s were" : " was"} not found
					</p>
				</div>
			)}
		</div>
	);
}
