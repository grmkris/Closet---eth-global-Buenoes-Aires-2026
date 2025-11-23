"use client";

import {
	CheckCircle,
	ChevronDown,
	Image as ImageIcon,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for generateOutfitPreview tool
 * Displays a compact collapsible outfit preview with metadata
 */
export function OutfitPreviewRenderer({ part }: ToolRendererProps) {
	const [fullScreenOpen, setFullScreenOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "generateOutfitPreview");
	const [selectedItemImage, setSelectedItemImage] = useState<string | null>(
		null
	);

	// Only render for successful results with image URL
	if (status !== "success" || !output?.success || !output?.imageUrl) {
		return null;
	}

	return (
		<>
			{/* Compact collapsible preview card */}
			<div className="mx-auto my-3 max-w-sm overflow-hidden rounded-lg border bg-card">
				{/* Clickable header for collapse/expand */}
				<button
					className="flex w-full cursor-pointer items-center gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50"
					onClick={() => setIsCollapsed(!isCollapsed)}
					type="button"
				>
					<ImageIcon className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium text-sm">Outfit Preview</span>
					<Badge className="ml-auto" variant="secondary">
						<CheckCircle className="mr-1 h-3 w-3 text-primary" />
						Generated
					</Badge>
					<ChevronDown
						className={cn(
							"ml-2 h-4 w-4 text-muted-foreground transition-transform",
							isCollapsed && "rotate-180"
						)}
					/>
				</button>

				{/* Collapsible content */}
				{!isCollapsed && (
					<>
						{/* Clickable preview image */}
						<button
							className="w-full cursor-pointer p-3 text-left"
							onClick={() => setFullScreenOpen(true)}
							type="button"
						>
							<div className="relative overflow-hidden rounded-lg bg-muted">
								{output.error ? (
									<div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
										<XCircle className="h-8 w-8 text-destructive" />
										<span className="text-sm">Failed to load image</span>
									</div>
								) : (
									<Image
										alt="Generated outfit preview"
										className="h-auto w-full transition-opacity hover:opacity-90"
										height={384}
										src={output.imageUrl}
										width={384}
									/>
								)}
							</div>
							<p className="mt-2 text-center text-muted-foreground text-xs">
								Tap to view full size
							</p>
						</button>

						{/* Metadata: Items in outfit */}
						{output.items && output.items.length > 0 && (
							<div className="space-y-2 border-t px-4 py-3">
								<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
									Items ({output.items.length})
								</p>
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
									{output.items.map((item, idx) => (
										<button
											className="group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:border-primary hover:shadow-md"
											key={item.id || idx}
											onClick={() => {
												const imageUrl =
													item.processedImageUrl ||
													item.imageUrl ||
													item.thumbnailUrl;
												if (imageUrl) {
													setSelectedItemImage(imageUrl);
												}
											}}
											type="button"
										>
											{/* Thumbnail */}
											<div className="relative aspect-square bg-muted">
												{item.thumbnailUrl || item.imageUrl ? (
													<Image
														alt={item.category || `Item ${idx + 1}`}
														className="h-full w-full object-cover"
														fill
														sizes="(max-width: 640px) 50vw, 33vw"
														src={(item.thumbnailUrl || item.imageUrl) ?? ""}
													/>
												) : (
													<div className="flex h-full items-center justify-center">
														<ImageIcon className="h-8 w-8 text-muted-foreground/30" />
													</div>
												)}
											</div>
											{/* Category badge */}
											<div className="absolute top-2 left-2">
												<Badge className="text-[10px]" variant="secondary">
													{item.category || `Item ${idx + 1}`}
												</Badge>
											</div>
										</button>
									))}
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Full-size modal */}
			<Dialog onOpenChange={setFullScreenOpen} open={fullScreenOpen}>
				<DialogContent className="max-w-4xl p-0">
					<div className="relative bg-muted">
						<Image
							alt="Outfit preview (full size)"
							className="h-auto w-full"
							height={1200}
							priority
							src={output.imageUrl}
							width={1200}
						/>
					</div>
				</DialogContent>
			</Dialog>

			{/* Item image modal */}
			<Dialog
				onOpenChange={(open) => {
					if (!open) {
						setSelectedItemImage(null);
					}
				}}
				open={selectedItemImage !== null}
			>
				<DialogContent className="max-w-3xl p-0">
					{selectedItemImage && (
						<div className="relative bg-muted">
							<Image
								alt="Item preview"
								className="h-auto w-full"
								height={1000}
								priority
								src={selectedItemImage}
								width={1000}
							/>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
