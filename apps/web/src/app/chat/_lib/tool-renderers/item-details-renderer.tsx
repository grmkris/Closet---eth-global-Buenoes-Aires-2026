"use client";

import { CheckCircle, Info, ShirtIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for getItemDetails tool
 * Displays item details as a card with image and metadata
 */
export function ItemDetailsRenderer({ part }: ToolRendererProps) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "getItemDetails");

	// Only render for successful results
	if (status !== "success" || !output) {
		return null;
	}

	// Prefer processed image, fall back to original, then thumbnail
	const imageUrl =
		output.processedImageUrl || output.imageUrl || output.thumbnailUrl;

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card">
			{/* Header */}
			<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
				<Info className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium text-sm">Item Details</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-primary" />
					Found
				</Badge>
			</div>

			<div className="grid gap-4 p-4 md:grid-cols-2">
				{/* Image */}
				<div className="relative aspect-square overflow-hidden rounded-md bg-muted/10">
					{imageUrl ? (
						<>
							{!imageLoaded && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-muted-foreground text-sm">
										Loading...
									</div>
								</div>
							)}
							<Image
								alt={output.categories.join(", ")}
								className={cn("object-contain", !imageLoaded && "hidden")}
								fill
								onLoad={() => setImageLoaded(true)}
								sizes="(max-width: 768px) 100vw, 50vw"
								src={imageUrl}
							/>
						</>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<ShirtIcon className="h-16 w-16 text-muted-foreground/30" />
						</div>
					)}
				</div>

				{/* Metadata */}
				<div className="space-y-4">
					{/* Categories */}
					<div>
						<div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
							Categories
						</div>
						<div className="flex flex-wrap gap-1">
							{output.categories.map((category) => (
								<Badge key={category} variant="secondary">
									{category}
								</Badge>
							))}
						</div>
					</div>

					{/* Colors */}
					{output.colors.length > 0 && (
						<div>
							<div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
								Colors
							</div>
							<div className="flex flex-wrap gap-2">
								{output.colors.map((color, idx) => (
									<div
										className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
										key={`${color.name}-${idx}`}
									>
										{color.hex && (
											<div
												className="h-4 w-4 rounded-full border"
												style={{ backgroundColor: color.hex }}
												title={color.name}
											/>
										)}
										<span className="text-sm">{color.name}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Tags by Type */}
					{Object.entries(output.tagsByType).length > 0 && (
						<div>
							<div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
								Tags
							</div>
							<div className="space-y-2">
								{Object.entries(output.tagsByType).map(([type, tags]) => (
									<div key={type}>
										<div className="mb-1 text-muted-foreground text-xs">
											{type.charAt(0).toUpperCase() + type.slice(1)}
										</div>
										<div className="flex flex-wrap gap-1">
											{tags.map((tag) => (
												<Badge key={tag} variant="outline">
													{tag}
												</Badge>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Dates */}
					<div className="border-t pt-3">
						<div className="space-y-1 text-muted-foreground text-xs">
							<div>
								Created:{" "}
								{new Date(output.createdAt).toLocaleDateString(undefined, {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</div>
							<div>
								Updated:{" "}
								{new Date(output.updatedAt).toLocaleDateString(undefined, {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
