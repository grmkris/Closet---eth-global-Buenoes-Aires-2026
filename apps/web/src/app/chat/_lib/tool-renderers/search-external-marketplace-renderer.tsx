"use client";

import {
	type MarketplaceItem,
	MarketplacePurchaseResponseSchema,
} from "@ai-stilist/api/features/ai/ai-tools";
import { CheckCircle2, ShoppingBag, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { useX402Fetch } from "@/hooks/use-x402-fetch";
import { client } from "@/utils/orpc";
import type { ToolRendererProps } from "./types";
import { getToolStatus, getTypedToolOutput } from "./types";

/**
 * Custom renderer for searchExternalMarketplace tool
 * Displays marketplace items in a card grid with prices and brand info
 */
export function SearchExternalMarketplaceRenderer({ part }: ToolRendererProps) {
	const status = getToolStatus(part);
	const output = getTypedToolOutput(part, "searchExternalMarketplace");

	// Only render for successful results
	if (status !== "success" || !output?.success) {
		return null;
	}

	const { items, itemCount } = output;

	return (
		<Card className="border-border/50">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<ShoppingBag className="h-5 w-5 text-primary" />
					<h3 className="font-semibold text-lg">External Marketplace</h3>
					<Badge className="ml-auto" variant="secondary">
						{itemCount} {itemCount === 1 ? "item" : "items"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						<ShoppingBag className="mx-auto mb-2 h-12 w-12 opacity-50" />
						<p>No items found in marketplace</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((item) => (
							<MarketplaceItemCard item={item} key={item.id} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Individual marketplace item card with X402 purchase functionality
 */
function MarketplaceItemCard({ item }: { item: MarketplaceItem }) {
	const { x402Fetch, isReady: isWalletReady } = useX402Fetch();
	const [isPurchasing, setIsPurchasing] = useState(false);

	const MARKETPLACE_URL = "http://localhost:3003";

	const handlePurchase = async () => {
		if (!(x402Fetch && isWalletReady)) {
			toast.error("Please connect your wallet first");
			return;
		}

		setIsPurchasing(true);

		try {
			// Step 1: Purchase from marketplace using X402
			toast.info("Initiating purchase... Please sign with your wallet");

			const response = await x402Fetch(
				`${MARKETPLACE_URL}/api/items/${item.id}`,
				{
					method: "POST",
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
						marketplaceUrl: MARKETPLACE_URL,
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
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Purchase failed";
			toast.error(errorMsg);
		} finally {
			setIsPurchasing(false);
		}
	};

	return (
		<Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
			{/* Item Image */}
			<div className="relative h-48 w-full bg-muted">
				<Image
					alt={item.name}
					className="object-cover"
					fill
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					src={item.imageUrl}
				/>
			</div>

			{/* Item Details */}
			<CardContent className="flex-1 space-y-2 p-4">
				{/* Brand */}
				{item.brand && (
					<div className="text-muted-foreground text-xs uppercase tracking-wide">
						{item.brand}
					</div>
				)}

				{/* Name */}
				<h4 className="line-clamp-2 font-semibold text-base">{item.name}</h4>

				{/* Description */}
				{item.description && (
					<p className="line-clamp-2 text-muted-foreground text-sm">
						{item.description}
					</p>
				)}

				{/* Category and Metadata */}
				<div className="flex flex-wrap gap-1.5">
					<Badge className="text-xs" variant="outline">
						{item.category}
					</Badge>
					{item.metadata.material && (
						<Badge className="text-xs" variant="secondary">
							{item.metadata.material}
						</Badge>
					)}
				</div>

				{/* Price and Availability */}
				<div className="flex items-center justify-between pt-2">
					<div className="font-bold text-lg">${item.price.toFixed(2)}</div>
					<div className="flex items-center gap-1 text-xs">
						{item.available ? (
							<>
								<CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
								<span className="text-green-600">In Stock</span>
							</>
						) : (
							<>
								<XCircle className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="text-muted-foreground">Out of Stock</span>
							</>
						)}
					</div>
				</div>

				{/* Size and Color Info */}
				{(item.metadata.size?.length || item.metadata.color?.length) && (
					<div className="flex gap-3 pt-1 text-muted-foreground text-xs">
						{item.metadata.size && item.metadata.size.length > 0 && (
							<div>
								<span className="font-medium">Sizes:</span>{" "}
								{item.metadata.size.join(", ")}
							</div>
						)}
						{item.metadata.color && item.metadata.color.length > 0 && (
							<div>
								<span className="font-medium">Colors:</span>{" "}
								{item.metadata.color.join(", ")}
							</div>
						)}
					</div>
				)}
			</CardContent>

			{/* Buy Button */}
			<CardFooter className="p-4 pt-0">
				<Button
					className="w-full"
					disabled={!(item.available && isWalletReady) || isPurchasing}
					onClick={handlePurchase}
					size="sm"
				>
					{isPurchasing ? "Processing..." : `Buy $${item.price.toFixed(2)}`}
				</Button>
			</CardFooter>
		</Card>
	);
}
