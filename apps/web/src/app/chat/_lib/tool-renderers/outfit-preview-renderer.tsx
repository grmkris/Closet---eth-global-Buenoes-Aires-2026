"use client";

import { CheckCircle, Image as ImageIcon, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for generateOutfitPreview tool
 * Displays generated outfit images inline instead of JSON
 */
export function OutfitPreviewRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "generateOutfitPreview");

	// Only render for successful results with image URL
	if (status !== "success" || !output?.success || !output?.imageUrl) {
		return null;
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card shadow-sm">
			{/* Header with gradient */}
			<div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-3">
				<ImageIcon className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium text-sm">Outfit Preview</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-primary" />
					Generated
				</Badge>
			</div>

			{/* Image */}
			<div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/20 to-muted/5">
				{!output.imageUrl && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-muted-foreground text-sm">
							Loading image...
						</div>
					</div>
				)}
				{output.error && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<XCircle className="h-8 w-8 text-destructive" />
							<span className="text-sm">Failed to load image</span>
						</div>
					</div>
				)}
				<Image
					alt="Generated outfit preview"
					className={cn("object-contain", !output.imageUrl && "hidden")}
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					src={output.imageUrl}
				/>
			</div>

			{/* Footer with gradient */}
			{output.message && (
				<div className="border-t bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3">
					<p className="text-muted-foreground text-sm">{output.message}</p>
					{output.itemCount !== undefined && (
						<p className="mt-1 text-muted-foreground text-xs">
							{output.itemCount} item{output.itemCount !== 1 ? "s" : ""}{" "}
							combined
						</p>
					)}
				</div>
			)}
		</div>
	);
}
