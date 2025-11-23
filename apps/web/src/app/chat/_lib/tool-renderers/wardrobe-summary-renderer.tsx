"use client";

import { Palette, Shirt, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for getWardrobeSummary tool
 * Displays wardrobe summary with categories, colors, and tags in a beautiful layout
 */
export function WardrobeSummaryRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "getWardrobeSummary");

	// Only render for successful results
	if (status !== "success" || !output) {
		return null;
	}

	const { totalItems, categories, colors, topTagsByType } = output;

	return (
		<Card className="border-border/50">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<Shirt className="h-5 w-5 text-primary" />
					<h3 className="font-semibold text-lg">Wardrobe Summary</h3>
					<Badge className="ml-auto" variant="secondary">
						{totalItems} {totalItems === 1 ? "item" : "items"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Categories Section */}
				{categories && categories.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<Shirt className="h-4 w-4" />
							<span>Categories</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{categories.map((category) => (
								<Badge
									className="gap-1.5 font-normal"
									key={category.name}
									variant="outline"
								>
									<span>{category.name}</span>
									<span className="text-muted-foreground text-xs">
										{category.count}
									</span>
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Colors Section */}
				{colors && colors.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<Palette className="h-4 w-4" />
							<span>Colors</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{colors.map((color) => (
								<Badge
									className="gap-2 font-normal"
									key={`${color.name}-${color.hex}`}
									variant="outline"
								>
									<div
										className="h-3 w-3 rounded-full border border-border/50"
										style={{ backgroundColor: color.hex ?? undefined }}
										title={color.hex ?? ""}
									/>
									<span>{color.name}</span>
									<span className="text-muted-foreground text-xs">
										{color.count}
									</span>
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Tags Section */}
				{topTagsByType && Object.keys(topTagsByType).length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<Tag className="h-4 w-4" />
							<span>Top Tags</span>
						</div>
						<div className="space-y-3">
							{Object.entries(topTagsByType).map(([type, tags]) => (
								<div className="space-y-1.5" key={type}>
									<div className="font-medium text-muted-foreground text-xs capitalize">
										{type}
									</div>
									<div className="flex flex-wrap gap-1.5">
										{tags.map((tag) => (
											<Badge
												className="font-normal text-xs"
												key={tag}
												variant="secondary"
											>
												{tag}
											</Badge>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
