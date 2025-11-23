"use client";

import { MarketplacePurchaseResponseSchema } from "@ai-stilist/api/features/ai/ai-tools";
import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { useX402Fetch } from "@/hooks/use-x402-fetch";
import { client } from "@/utils/orpc";
import { useChatContext } from "../chat-context";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolInput, isToolCall } from "./types";

/**
 * Custom renderer for purchaseFromMarketplace tool
 * Shows item preview and purchase confirmation with X402 payment
 */
export function PurchaseMarketplaceRenderer({ part }: ToolRendererProps) {
	const _status = getToolStatus(part);
	const isCall = isToolCall(part);
	const input = getTypedToolInput(part, "purchaseFromMarketplace");
	const { addToolOutput } = useChatContext();
	const { x402Fetch, isReady: isWalletReady } = useX402Fetch();

	// Get toolCallId safely - only exists for tool calls
	const toolCallId =
		isCall && "toolCallId" in part ? part.toolCallId : undefined;

	// Extract item from input
	const item = input?.item;

	const [error, setError] = useState<string | null>(null);
	const [isPurchasing, setIsPurchasing] = useState(false);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Purchase flow requires sequential validation steps
	const handlePurchase = async () => {
		if (!(input && item && x402Fetch)) {
			return;
		}

		setIsPurchasing(true);
		setError(null);

		try {
			// Step 1: Purchase from marketplace using X402
			toast.info("Initiating purchase... Please sign with your wallet");

			const response = await x402Fetch(
				`http://localhost:3003/api/items/${input.itemId}`,
				{
					method: "GET",
				}
			);

			if (!response.ok) {
				throw new Error(
					`Purchase failed: ${response.status} ${response.statusText}`
				);
			}

			const json = await response.json();
			const purchaseData = MarketplacePurchaseResponseSchema.parse(json);
			toast.success("Purchase successful!");

			// Step 2: Add item to user's wardrobe
			try {
				await client.wardrobe.createItemFromMarketplacePurchase({
					marketplaceItemId: item.id,
					name: item.name,
					description: item.description,
					price: item.price,
					category: item.category,
					brand: item.brand,
					imageUrl: item.imageUrl,
					metadata: {
						sizes: item.metadata.size,
						colors: item.metadata.color,
						material: item.metadata.material,
						marketplaceUrl: "http://localhost:3003",
						purchaseId: purchaseData.purchase.id,
						txHash: purchaseData.purchase.txHash,
					},
				});

				toast.success("Item added to your wardrobe!");
			} catch (wardrobeError) {
				// Purchase succeeded but wardrobe add failed - log but don't fail
				console.error("Failed to add to wardrobe:", wardrobeError);
				toast.warning(
					"Purchase successful, but failed to add to wardrobe. Please add manually."
				);
			}

			// Step 3: Return tool result
			if (toolCallId) {
				addToolOutput({
					tool: "purchaseFromMarketplace",
					toolCallId,
					output: {
						success: true,
						item: {
							id: item.id,
							name: item.name,
							price: item.price,
						},
						purchase: purchaseData.purchase,
						message: `Successfully purchased ${item.name} for $${item.price}`,
					},
				});
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Purchase failed";
			setError(errorMsg);
			toast.error(errorMsg);

			// Return error result
			if (toolCallId) {
				addToolOutput({
					tool: "purchaseFromMarketplace",
					toolCallId,
					output: {
						success: false,
						error: errorMsg,
						message: `Failed to purchase item: ${errorMsg}`,
					},
				});
			}
		} finally {
			setIsPurchasing(false);
		}
	};

	// Only render for tool calls with valid input and item
	if (!(isCall && input && item)) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2">
				<ShoppingCart className="h-5 w-5" />
				<span className="font-semibold">Purchase Confirmation</span>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-4">
					{/* Item Image */}
					<div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg border">
						<Image
							alt={item.name}
							className="object-cover"
							fill
							sizes="128px"
							src={item.imageUrl}
						/>
					</div>

					{/* Item Details */}
					<div className="flex-1 space-y-2">
						<h3 className="font-semibold text-lg">{item.name}</h3>
						<p className="text-muted-foreground text-sm">{item.description}</p>
						<div className="flex flex-wrap gap-2 text-sm">
							<span className="rounded-full bg-secondary px-2 py-1">
								{item.category}
							</span>
							{item.brand && (
								<span className="rounded-full bg-secondary px-2 py-1">
									{item.brand}
								</span>
							)}
							{item.metadata.material && (
								<span className="rounded-full bg-secondary px-2 py-1">
									{item.metadata.material}
								</span>
							)}
						</div>
						<p className="font-bold text-xl">${item.price.toFixed(2)}</p>
					</div>
				</div>

				{error && (
					<div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
						{error}
					</div>
				)}
			</CardContent>
			<CardFooter className="flex justify-end gap-2">
				<Button
					disabled={isPurchasing}
					onClick={() => {
						if (toolCallId) {
							addToolOutput({
								tool: "purchaseFromMarketplace",
								toolCallId,
								output: {
									success: false,
									error: "Cancelled by user",
									message: "Purchase cancelled by user",
								},
							});
						}
					}}
					variant="outline"
				>
					Cancel
				</Button>
				<Button
					disabled={!isWalletReady || isPurchasing}
					onClick={handlePurchase}
				>
					{isPurchasing
						? "Processing..."
						: `Purchase $${item.price.toFixed(2)}`}
				</Button>
			</CardFooter>
		</Card>
	);
}
