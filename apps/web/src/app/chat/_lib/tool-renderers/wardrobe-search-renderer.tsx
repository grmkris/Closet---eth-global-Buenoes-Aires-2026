"use client";

import { CheckCircle, Search, ShirtIcon } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ToolRendererProps } from "./types";
import { getToolOutput, getToolStatus } from "./types";

type WardrobeItem = {
	id: string;
	categories: string[];
	colors: Array<{ name: string; hex: string }>;
	tagsByType: Record<string, string[]>;
	thumbnailUrl: string | null;
	createdAt: Date | string;
};

type WardrobeSearchOutput = {
	items: WardrobeItem[];
	total: number;
	hasMore: boolean;
};

/**
 * Custom renderer for searchWardrobe tool
 * Displays clothing items as a thumbnail grid instead of JSON
 */
export function WardrobeSearchRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getToolOutput(part) as WardrobeSearchOutput | undefined;

	// Only render for successful results
	if (status !== "success" || !output?.items) {
		return null;
	}

	const { items, total, hasMore } = output;

	if (items.length === 0) {
		return (
			<div className="my-3 rounded-lg border bg-card">
				<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
					<Search className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium text-sm">Wardrobe Search</span>
					<Badge className="ml-auto" variant="secondary">
						No results
					</Badge>
				</div>
				<div className="p-6 text-center text-muted-foreground text-sm">
					No items found matching your search criteria
				</div>
			</div>
		);
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card">
			{/* Header */}
			<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
				<Search className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium text-sm">Wardrobe Search</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-green-600" />
					{total} item{total !== 1 ? "s" : ""}
					{hasMore && "+"}
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
											<div
												className="h-3 w-3 rounded-full border"
												style={{ backgroundColor: color.hex }}
												title={color.name}
											/>
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

			{/* Footer note if there are more results */}
			{hasMore && (
				<div className="border-t bg-muted/30 px-3 py-2">
					<p className="text-muted-foreground text-xs">
						Showing {total} items. More items available in your wardrobe.
					</p>
				</div>
			)}
		</div>
	);
}
