#!/usr/bin/env bun

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { MarketplaceItem } from "../apps/marketplace-server/src/types"

type FestivalItemFromJSON = {
	id: string
	name: string
	category: "top" | "bottom" | "shoes" | "accessory" | "outerwear" | "dress"
	colors: string[]
	style: string[]
	gender: "men" | "women" | "unisex"
	imageUrl: string
	localPath: string
}

// Map festival categories to marketplace categories
const CATEGORY_MAP: Record<
	FestivalItemFromJSON["category"],
	string
> = {
	top: "tops",
	bottom: "bottoms",
	shoes: "footwear",
	accessory: "accessories",
	outerwear: "outerwear",
	dress: "dresses",
}

// Price tiers by category (in USDC)
const PRICE_BY_CATEGORY: Record<string, number> = {
	tops: 0.03,
	bottoms: 0.03,
	footwear: 0.04,
	accessories: 0.02,
	outerwear: 0.05,
	dresses: 0.04,
}

// Size options by category
const SIZE_OPTIONS: Record<string, string[]> = {
	tops: ["XS", "S", "M", "L", "XL"],
	bottoms: ["XS", "S", "M", "L", "XL"],
	footwear: ["7", "8", "9", "10", "11", "12"],
	accessories: [], // No size for accessories
	outerwear: ["S", "M", "L", "XL"],
	dresses: ["XS", "S", "M", "L", "XL"],
}

// Map style tags to materials
function getMaterial(style: string[]): string {
	if (style.includes("holographic")) return "Holographic Fabric"
	if (style.includes("mesh")) return "Breathable Mesh"
	if (style.includes("sequin")) return "Sequin Fabric"
	if (style.includes("led")) return "LED-Integrated Fabric"
	if (style.includes("metallic")) return "Metallic Fabric"
	if (style.includes("neon")) return "UV-Reactive Fabric"
	if (style.includes("fringe")) return "Fringe Fabric"
	return "Synthetic Blend"
}

// Generate description from item properties
function generateDescription(item: FestivalItemFromJSON): string {
	const colorText =
		item.colors.length > 1
			? `${item.colors.slice(0, -1).join(", ")} and ${item.colors[item.colors.length - 1]}`
			: item.colors[0]

	const styleText = item.style
		.filter((s) => s !== "rave" && s !== "festival")
		.slice(0, 2)
		.join(" ")

	return `Vibrant ${styleText} ${item.category} in ${colorText} colors, perfect for festivals and raves`
}

// Transform festival item to marketplace item
function transformFestivalItem(
	item: FestivalItemFromJSON,
): MarketplaceItem {
	const marketplaceCategory = CATEGORY_MAP[item.category]
	const price = PRICE_BY_CATEGORY[marketplaceCategory]
	const sizes = SIZE_OPTIONS[marketplaceCategory]

	return {
		id: item.id,
		name: item.name,
		description: generateDescription(item),
		category: marketplaceCategory,
		brand: "Festival Collective",
		price,
		imageUrl: item.imageUrl,
		available: true,
		metadata: {
			...(sizes.length > 0 && { size: sizes }),
			color: item.colors,
			material: getMaterial(item.style),
		},
	}
}

async function main() {
	const jsonPath = join(
		import.meta.dir,
		"../apps/marketplace-server/public/festival-items/items.json",
	)

	const jsonContent = await readFile(jsonPath, "utf-8")
	const data = JSON.parse(jsonContent) as {
		items: FestivalItemFromJSON[]
	}

	const transformedItems = data.items.map(transformFestivalItem)

	// Output as TypeScript code
	console.log("// Festival Items - Auto-generated")
	console.log(JSON.stringify(transformedItems, null, "\t"))
}

main().catch((error) => {
	console.error("Error:", error)
	process.exit(1)
})
