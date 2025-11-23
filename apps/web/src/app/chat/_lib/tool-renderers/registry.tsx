"use client";

import type { MyUIMessagePart } from "@ai-stilist/api/features/ai/message-type";
import type { MessageId } from "@ai-stilist/shared/typeid";
import { DefaultToolRenderer } from "./default-tool-renderer";
import { ItemDetailsRenderer } from "./item-details-renderer";
import { OutfitPreviewRenderer } from "./outfit-preview-renderer";
import { PurchaseMarketplaceRenderer } from "./purchase-marketplace-renderer";
import { SearchExternalMarketplaceRenderer } from "./search-external-marketplace-renderer";
import { ShowItemsRenderer } from "./show-items-renderer";
import type { ToolRendererEntry } from "./types";
import { getToolName, isToolPart } from "./types";
import { WardrobeSearchRenderer } from "./wardrobe-search-renderer";
import { WardrobeSummaryRenderer } from "./wardrobe-summary-renderer";

/**
 * Registry of tool renderers
 * Maps tool names/patterns to their specific renderer components
 */
const toolRenderers: Record<string, ToolRendererEntry> = {
	// Wardrobe tools
	generateOutfitPreview: {
		renderer: OutfitPreviewRenderer,
		displayName: "Outfit Preview",
	},
	searchWardrobe: {
		renderer: WardrobeSearchRenderer,
		displayName: "Wardrobe Search",
	},
	getWardrobeSummary: {
		renderer: WardrobeSummaryRenderer,
		displayName: "Wardrobe Summary",
	},
	getItemDetails: {
		renderer: ItemDetailsRenderer,
		displayName: "Item Details",
	},
	showItems: {
		renderer: ShowItemsRenderer,
		displayName: "Show Items",
	},

	// Marketplace tools
	searchExternalMarketplace: {
		renderer: SearchExternalMarketplaceRenderer,
		displayName: "Marketplace Search",
	},
	purchaseFromMarketplace: {
		renderer: PurchaseMarketplaceRenderer,
		displayName: "Purchase Item",
	},

	// Default fallback - handles all other tools
	default: {
		renderer: DefaultToolRenderer,
		displayName: "Tool",
	},
};

/**
 * Get the appropriate renderer for a tool
 */
function getRenderer(toolName: string): ToolRendererEntry {
	// Direct match
	if (toolRenderers[toolName]) {
		return toolRenderers[toolName];
	}

	// Pattern match (for tools with regex patterns)
	for (const [, entry] of Object.entries(toolRenderers)) {
		if (entry.pattern?.test(toolName)) {
			return entry;
		}
	}

	// Default fallback - guaranteed to exist
	return (
		toolRenderers.default || {
			renderer: DefaultToolRenderer,
			displayName: "Tool",
		}
	);
}

/**
 * Component to render a tool part using the appropriate renderer
 */
export function ToolPartRenderer({
	part,
	messageId,
	isLatest,
}: {
	part: MyUIMessagePart;
	messageId: MessageId;
	isLatest?: boolean;
}) {
	// Only render tool parts
	if (!isToolPart(part)) {
		return null;
	}

	const toolName = getToolName(part);
	if (!toolName) {
		return null;
	}

	const entry = getRenderer(toolName);
	const Renderer = entry.renderer;

	const props = {
		part,
		messageId,
		isLatest,
	};

	return <Renderer {...props} />;
}
