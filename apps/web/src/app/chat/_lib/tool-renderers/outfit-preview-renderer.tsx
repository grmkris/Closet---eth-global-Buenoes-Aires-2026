"use client";

import { CheckCircle, Image as ImageIcon, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for generateOutfitPreview tool
 * Displays generated outfit images inline instead of JSON
 */
export function OutfitPreviewRenderer({ part }: ToolRendererProps) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "generateOutfitPreview");

	// Only render for successful results with image URL
	if (status !== "success" || !output?.success || !output?.imageUrl) {
		return null;
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border bg-card">
			{/* Header */}
			<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
				<ImageIcon className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium text-sm">Outfit Preview</span>
				<Badge className="ml-auto" variant="secondary">
					<CheckCircle className="mr-1 h-3 w-3 text-primary" />
					Generated
				</Badge>
			</div>

			{/* Image */}
			<div className="relative aspect-square bg-muted/10">
				{!(imageLoaded || imageError) && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-muted-foreground text-sm">
							Loading image...
						</div>
					</div>
				)}
				{imageError && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<XCircle className="h-8 w-8 text-destructive" />
							<span className="text-sm">Failed to load image</span>
						</div>
					</div>
				)}
				<Image
					alt="Generated outfit preview"
					className={cn("object-contain", !imageLoaded && "hidden")}
					fill
					onError={() => {
						setImageError(true);
						setImageLoaded(false);
					}}
					onLoad={() => {
						setImageLoaded(true);
						setImageError(false);
					}}
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					src={output.imageUrl}
				/>
			</div>

			{/* Footer with message */}
			{output.message && (
				<div className="border-t bg-muted/30 px-3 py-2">
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
