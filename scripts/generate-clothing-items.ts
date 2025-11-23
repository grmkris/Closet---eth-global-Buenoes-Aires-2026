import fs from "node:fs";
import path from "node:path";
import { createAiClient } from "../packages/ai/src/ai-client.ts";
import { createLogger } from "../packages/logger/src/logger.ts";

// ============================================================================
// TYPES
// ============================================================================

type ClothingItem = {
	id: string;
	category: string; // top, bottom, dress, shoes, outerwear, accessory
	name: string;
	brand: string;
	colors: string[]; // ["black", "white"]
	material: string; // cotton, denim, leather, etc.
	style: string[]; // casual, formal, streetwear, etc.
	season: string[]; // summer, winter, fall, spring, all-season
	fit?: string; // slim-fit, oversized, regular, etc.
	pattern?: string; // solid, striped, floral, etc.
	details?: string[]; // crew-neck, button-up, high-waisted, etc.
	features?: string[]; // breathable, waterproof, stretch, etc.
	gender: "men" | "women" | "unisex";
	tier: 1 | 2 | 3 | 4; // Priority tier
	marketplace?: boolean; // Is this a marketplace exclusive item?
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Gender filter for generation
 * - "all": Generate all items (men + women + unisex) - 129 items total
 * - "men": Generate men's items + unisex accessories - ~64 items
 * - "women": Generate women's items + unisex accessories - ~70 items
 */
const GENDER_FILTER: "men" | "women" | "all" = "all";

// ============================================================================
// ITEM DEFINITIONS - ALL 149 ITEMS
// ============================================================================

const CLOTHING_ITEMS: ClothingItem[] = [
	// ======================
	// MEN'S TOPS (15 items)
	// ======================
	{
		id: "men-top-001",
		category: "top",
		name: "White crew-neck t-shirt",
		brand: "Uniqlo",
		colors: ["white"],
		material: "cotton",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "short-sleeve"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-top-002",
		category: "top",
		name: "Black crew-neck t-shirt",
		brand: "H&M",
		colors: ["black"],
		material: "cotton",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "short-sleeve"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-top-003",
		category: "top",
		name: "Navy v-neck t-shirt",
		brand: "Gap",
		colors: ["navy"],
		material: "cotton",
		style: ["casual"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["v-neck", "short-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-004",
		category: "top",
		name: "Striped long-sleeve t-shirt",
		brand: "Zara",
		colors: ["navy", "white"],
		material: "cotton",
		style: ["casual"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "striped",
		details: ["crew-neck", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-005",
		category: "top",
		name: "White oxford button-down shirt",
		brand: "Uniqlo",
		colors: ["white"],
		material: "cotton",
		style: ["business-casual", "formal"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["button-up", "collar", "long-sleeve"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-top-006",
		category: "top",
		name: "Light blue dress shirt",
		brand: "H&M",
		colors: ["light blue"],
		material: "cotton",
		style: ["business-casual", "formal"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["button-up", "collar", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-007",
		category: "top",
		name: "Black turtleneck sweater",
		brand: "Zara",
		colors: ["black"],
		material: "merino wool",
		style: ["minimalist", "smart-casual"],
		season: ["fall", "winter"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["turtleneck", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-008",
		category: "top",
		name: "Gray crew-neck sweater",
		brand: "Gap",
		colors: ["gray"],
		material: "cotton blend",
		style: ["casual"],
		season: ["fall", "winter"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-009",
		category: "top",
		name: "Navy cable-knit sweater",
		brand: "Mango",
		colors: ["navy"],
		material: "wool blend",
		style: ["casual", "preppy"],
		season: ["winter"],
		fit: "regular",
		pattern: "cable-knit",
		details: ["crew-neck", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-010",
		category: "top",
		name: "Gray hoodie",
		brand: "Nike",
		colors: ["gray"],
		material: "cotton fleece",
		style: ["casual", "athletic"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["hood", "kangaroo-pocket"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-011",
		category: "top",
		name: "Red and black flannel shirt",
		brand: "Uniqlo",
		colors: ["red", "black"],
		material: "cotton",
		style: ["casual", "workwear"],
		season: ["fall", "winter"],
		fit: "regular",
		pattern: "plaid",
		details: ["button-up", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-012",
		category: "top",
		name: "Light wash denim shirt",
		brand: "Levi's",
		colors: ["light blue"],
		material: "denim",
		style: ["casual"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["button-up", "long-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-013",
		category: "top",
		name: "Navy polo shirt",
		brand: "Ralph Lauren",
		colors: ["navy"],
		material: "cotton pique",
		style: ["casual", "preppy"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["polo-collar", "short-sleeve"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-top-014",
		category: "top",
		name: "Black athletic performance t-shirt",
		brand: "Adidas",
		colors: ["black"],
		material: "polyester",
		style: ["athletic"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "short-sleeve"],
		features: ["breathable", "moisture-wicking"],
		gender: "men",
		tier: 3,
	},
	{
		id: "men-top-015",
		category: "top",
		name: "Charcoal long-sleeve henley",
		brand: "Gap",
		colors: ["charcoal"],
		material: "cotton",
		style: ["casual"],
		season: ["fall"],
		fit: "regular",
		pattern: "solid",
		details: ["henley", "long-sleeve"],
		gender: "men",
		tier: 2,
	},

	// ======================
	// WOMEN'S TOPS (15 items)
	// ======================
	{
		id: "women-top-001",
		category: "top",
		name: "White basic t-shirt",
		brand: "Everlane",
		colors: ["white"],
		material: "cotton",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "short-sleeve"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-top-002",
		category: "top",
		name: "Black basic t-shirt",
		brand: "COS",
		colors: ["black"],
		material: "cotton",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["crew-neck", "short-sleeve"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-top-003",
		category: "top",
		name: "Striped breton top",
		brand: "Zara",
		colors: ["navy", "white"],
		material: "cotton",
		style: ["casual", "nautical"],
		season: ["spring", "summer"],
		fit: "regular",
		pattern: "striped",
		details: ["boat-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-004",
		category: "top",
		name: "Cream silk blouse",
		brand: "Mango",
		colors: ["cream"],
		material: "silk",
		style: ["elegant", "business-casual"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["v-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-005",
		category: "top",
		name: "White button-down shirt",
		brand: "Everlane",
		colors: ["white"],
		material: "cotton",
		style: ["minimalist", "business-casual"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["button-up", "collar", "long-sleeve"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-top-006",
		category: "top",
		name: "Beige cropped sweater",
		brand: "H&M",
		colors: ["beige"],
		material: "knit",
		style: ["casual"],
		season: ["fall", "winter"],
		fit: "cropped",
		pattern: "solid",
		details: ["crew-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-007",
		category: "top",
		name: "Black turtleneck",
		brand: "Uniqlo",
		colors: ["black"],
		material: "merino wool",
		style: ["minimalist", "smart-casual"],
		season: ["fall", "winter"],
		fit: "fitted",
		pattern: "solid",
		details: ["turtleneck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-008",
		category: "top",
		name: "Oversized gray sweater",
		brand: "Zara",
		colors: ["gray"],
		material: "wool blend",
		style: ["casual", "cozy"],
		season: ["fall", "winter"],
		fit: "oversized",
		pattern: "solid",
		details: ["crew-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-009",
		category: "top",
		name: "Camel cardigan",
		brand: "COS",
		colors: ["camel"],
		material: "cashmere blend",
		style: ["elegant", "minimalist"],
		season: ["fall", "winter"],
		fit: "regular",
		pattern: "solid",
		details: ["open-front", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-010",
		category: "top",
		name: "White ribbed tank top",
		brand: "Gap",
		colors: ["white"],
		material: "cotton",
		style: ["casual"],
		season: ["summer"],
		fit: "fitted",
		pattern: "ribbed",
		details: ["sleeveless"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-011",
		category: "top",
		name: "Vintage band graphic t-shirt",
		brand: "Urban Outfitters",
		colors: ["black", "white"],
		material: "cotton",
		style: ["casual", "vintage"],
		season: ["all-season"],
		fit: "regular",
		pattern: "graphic",
		details: ["crew-neck", "short-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-012",
		category: "top",
		name: "Floral print blouse",
		brand: "Zara",
		colors: ["pink", "green", "white"],
		material: "viscose",
		style: ["feminine", "romantic"],
		season: ["spring", "summer"],
		fit: "regular",
		pattern: "floral",
		details: ["v-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-013",
		category: "top",
		name: "Dusty pink cropped hoodie",
		brand: "Alo Yoga",
		colors: ["dusty pink"],
		material: "cotton fleece",
		style: ["athletic", "casual"],
		season: ["all-season"],
		fit: "cropped",
		pattern: "solid",
		details: ["hood", "cropped"],
		gender: "women",
		tier: 3,
	},
	{
		id: "women-top-014",
		category: "top",
		name: "Black fitted long-sleeve",
		brand: "Everlane",
		colors: ["black"],
		material: "cotton",
		style: ["minimalist", "casual"],
		season: ["all-season"],
		fit: "fitted",
		pattern: "solid",
		details: ["crew-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-top-015",
		category: "top",
		name: "Navy silk camisole",
		brand: "Mango",
		colors: ["navy"],
		material: "silk",
		style: ["elegant"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["spaghetti-strap", "sleeveless"],
		gender: "women",
		tier: 2,
	},

	// ======================
	// MEN'S BOTTOMS (12 items)
	// ======================
	{
		id: "men-bottom-001",
		category: "bottom",
		name: "Dark wash raw denim jeans",
		brand: "Levi's 511",
		colors: ["dark blue"],
		material: "denim",
		style: ["casual"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["five-pocket", "raw-denim"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-bottom-002",
		category: "bottom",
		name: "Light wash jeans",
		brand: "Zara",
		colors: ["light blue"],
		material: "denim",
		style: ["casual"],
		season: ["spring", "summer"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["five-pocket", "distressed"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-003",
		category: "bottom",
		name: "Black jeans",
		brand: "Diesel",
		colors: ["black"],
		material: "denim",
		style: ["casual", "streetwear"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["five-pocket"],
		features: ["stretch"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-bottom-004",
		category: "bottom",
		name: "Khaki chinos",
		brand: "Gap",
		colors: ["khaki"],
		material: "cotton",
		style: ["casual", "business-casual"],
		season: ["spring", "summer", "fall"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["flat-front"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-bottom-005",
		category: "bottom",
		name: "Navy chinos",
		brand: "Uniqlo",
		colors: ["navy"],
		material: "cotton",
		style: ["casual", "business-casual"],
		season: ["all-season"],
		fit: "tapered",
		pattern: "solid",
		details: ["flat-front"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-006",
		category: "bottom",
		name: "Gray dress pants",
		brand: "H&M",
		colors: ["gray"],
		material: "wool blend",
		style: ["formal", "business"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["flat-front", "creased"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-007",
		category: "bottom",
		name: "Black dress pants",
		brand: "Zara",
		colors: ["black"],
		material: "wool blend",
		style: ["formal", "business"],
		season: ["all-season"],
		fit: "tailored",
		pattern: "solid",
		details: ["flat-front", "creased"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-008",
		category: "bottom",
		name: "Olive cargo pants",
		brand: "Carhartt",
		colors: ["olive"],
		material: "cotton canvas",
		style: ["casual", "workwear"],
		season: ["fall"],
		fit: "relaxed-fit",
		pattern: "solid",
		details: ["cargo-pockets"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-009",
		category: "bottom",
		name: "Black athletic joggers",
		brand: "Nike",
		colors: ["black"],
		material: "polyester",
		style: ["athletic", "casual"],
		season: ["all-season"],
		fit: "tapered",
		pattern: "solid",
		details: ["elastic-waist", "drawstring"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-bottom-010",
		category: "bottom",
		name: "Navy chino shorts",
		brand: "Gap",
		colors: ["navy"],
		material: "cotton",
		style: ["casual"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["9-inch-inseam"],
		gender: "men",
		tier: 3,
	},
	{
		id: "men-bottom-011",
		category: "bottom",
		name: "Light wash denim shorts",
		brand: "Levi's",
		colors: ["light blue"],
		material: "denim",
		style: ["casual"],
		season: ["summer"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["five-pocket"],
		gender: "men",
		tier: 3,
	},
	{
		id: "men-bottom-012",
		category: "bottom",
		name: "Brown corduroy pants",
		brand: "Mango",
		colors: ["brown"],
		material: "corduroy",
		style: ["casual", "vintage"],
		season: ["fall", "winter"],
		fit: "straight-leg",
		pattern: "corduroy",
		details: ["five-pocket"],
		gender: "men",
		tier: 2,
	},

	// ======================
	// WOMEN'S BOTTOMS (12 items)
	// ======================
	{
		id: "women-bottom-001",
		category: "bottom",
		name: "Dark wash high-waisted jeans",
		brand: "Levi's",
		colors: ["dark blue"],
		material: "denim",
		style: ["casual"],
		season: ["all-season"],
		fit: "skinny",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-bottom-002",
		category: "bottom",
		name: "Light wash mom jeans",
		brand: "Zara",
		colors: ["light blue"],
		material: "denim",
		style: ["casual", "vintage"],
		season: ["spring", "summer"],
		fit: "relaxed-fit",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-bottom-003",
		category: "bottom",
		name: "Black jeans",
		brand: "Everlane",
		colors: ["black"],
		material: "denim",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		fit: "straight-leg",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-bottom-004",
		category: "bottom",
		name: "Vintage wash wide-leg jeans",
		brand: "Madewell",
		colors: ["medium blue"],
		material: "denim",
		style: ["casual", "vintage"],
		season: ["all-season"],
		fit: "wide-leg",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-005",
		category: "bottom",
		name: "White jeans",
		brand: "COS",
		colors: ["white"],
		material: "denim",
		style: ["casual", "minimalist"],
		season: ["spring", "summer"],
		fit: "straight-leg",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-006",
		category: "bottom",
		name: "Black dress pants",
		brand: "Mango",
		colors: ["black"],
		material: "wool blend",
		style: ["business-casual", "formal"],
		season: ["all-season"],
		fit: "tailored",
		pattern: "solid",
		details: ["flat-front", "creased"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-007",
		category: "bottom",
		name: "Khaki wide-leg trousers",
		brand: "Everlane",
		colors: ["khaki"],
		material: "cotton",
		style: ["casual", "minimalist"],
		season: ["spring", "fall"],
		fit: "wide-leg",
		pattern: "solid",
		details: ["high-waisted"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-008",
		category: "bottom",
		name: "Black pleated midi skirt",
		brand: "Zara",
		colors: ["black"],
		material: "polyester",
		style: ["elegant", "business-casual"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["pleated", "midi-length"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-009",
		category: "bottom",
		name: "Denim A-line mini skirt",
		brand: "Levi's",
		colors: ["medium blue"],
		material: "denim",
		style: ["casual"],
		season: ["spring", "summer"],
		fit: "regular",
		pattern: "solid",
		details: ["a-line", "mini-length"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-010",
		category: "bottom",
		name: "Black faux-leather pants",
		brand: "Zara",
		colors: ["black"],
		material: "faux-leather",
		style: ["edgy", "night-out"],
		season: ["fall", "winter"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["high-waisted"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-011",
		category: "bottom",
		name: "Black high-rise athletic leggings",
		brand: "Lululemon",
		colors: ["black"],
		material: "nylon",
		style: ["athletic"],
		season: ["all-season"],
		fit: "fitted",
		pattern: "solid",
		details: ["high-rise"],
		features: ["moisture-wicking", "stretch"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-bottom-012",
		category: "bottom",
		name: "High-waisted denim shorts",
		brand: "Levi's",
		colors: ["light blue"],
		material: "denim",
		style: ["casual"],
		season: ["summer"],
		fit: "mom-fit",
		pattern: "solid",
		details: ["high-waisted", "five-pocket"],
		gender: "women",
		tier: 3,
	},

	// ======================
	// MEN'S OUTERWEAR (10 items)
	// ======================
	{
		id: "men-outerwear-001",
		category: "outerwear",
		name: "Medium wash denim jacket",
		brand: "Levi's",
		colors: ["medium blue"],
		material: "denim",
		style: ["casual", "classic"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["trucker-style", "button-front"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-outerwear-002",
		category: "outerwear",
		name: "Black leather moto jacket",
		brand: "Zara",
		colors: ["black"],
		material: "leather",
		style: ["edgy", "streetwear"],
		season: ["fall", "winter"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["moto-style", "zipper", "lapels"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-003",
		category: "outerwear",
		name: "Navy wool coat",
		brand: "H&M",
		colors: ["navy"],
		material: "wool",
		style: ["formal", "business"],
		season: ["winter"],
		fit: "regular",
		pattern: "solid",
		details: ["single-breasted", "notch-lapel"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-004",
		category: "outerwear",
		name: "Black quilted puffer jacket",
		brand: "The North Face",
		colors: ["black"],
		material: "nylon",
		style: ["casual", "athletic"],
		season: ["winter"],
		fit: "regular",
		pattern: "quilted",
		details: ["zipper", "hood"],
		features: ["insulated", "water-resistant"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-outerwear-005",
		category: "outerwear",
		name: "Olive bomber jacket",
		brand: "Alpha Industries",
		colors: ["olive"],
		material: "nylon",
		style: ["casual", "military"],
		season: ["fall"],
		fit: "regular",
		pattern: "solid",
		details: ["zipper", "ribbed-cuffs"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-006",
		category: "outerwear",
		name: "Beige trench coat",
		brand: "Zara",
		colors: ["beige"],
		material: "cotton",
		style: ["classic", "formal"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["double-breasted", "belt"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-007",
		category: "outerwear",
		name: "Gray zip-up hoodie",
		brand: "Nike",
		colors: ["gray"],
		material: "cotton fleece",
		style: ["casual", "athletic"],
		season: ["all-season"],
		fit: "regular",
		pattern: "solid",
		details: ["zipper", "hood", "pockets"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-008",
		category: "outerwear",
		name: "Navy blazer",
		brand: "H&M",
		colors: ["navy"],
		material: "cotton blend",
		style: ["business-casual", "smart-casual"],
		season: ["all-season"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["notch-lapel", "two-button"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-009",
		category: "outerwear",
		name: "Green waterproof parka",
		brand: "Carhartt",
		colors: ["green"],
		material: "nylon",
		style: ["casual", "outdoor"],
		season: ["winter"],
		fit: "regular",
		pattern: "solid",
		details: ["zipper", "hood", "pockets"],
		features: ["waterproof", "insulated"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-outerwear-010",
		category: "outerwear",
		name: "Gray shawl-collar cardigan",
		brand: "Gap",
		colors: ["gray"],
		material: "knit",
		style: ["casual", "cozy"],
		season: ["fall", "winter"],
		fit: "regular",
		pattern: "solid",
		details: ["shawl-collar", "button-front"],
		gender: "men",
		tier: 2,
	},

	// ======================
	// WOMEN'S OUTERWEAR (10 items)
	// ======================
	{
		id: "women-outerwear-001",
		category: "outerwear",
		name: "Light wash denim jacket",
		brand: "Levi's",
		colors: ["light blue"],
		material: "denim",
		style: ["casual", "classic"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["trucker-style", "button-front"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-outerwear-002",
		category: "outerwear",
		name: "Black leather moto jacket",
		brand: "Zara",
		colors: ["black"],
		material: "leather",
		style: ["edgy", "streetwear"],
		season: ["fall", "winter"],
		fit: "slim-fit",
		pattern: "solid",
		details: ["moto-style", "zipper", "lapels"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-outerwear-003",
		category: "outerwear",
		name: "Beige trench coat",
		brand: "Everlane",
		colors: ["beige"],
		material: "cotton",
		style: ["classic", "elegant"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["double-breasted", "belt"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-outerwear-004",
		category: "outerwear",
		name: "Camel double-breasted wool coat",
		brand: "COS",
		colors: ["camel"],
		material: "wool",
		style: ["elegant", "minimalist"],
		season: ["winter"],
		fit: "regular",
		pattern: "solid",
		details: ["double-breasted", "notch-lapel"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-outerwear-005",
		category: "outerwear",
		name: "Cream quilted puffer jacket",
		brand: "Patagonia",
		colors: ["cream"],
		material: "nylon",
		style: ["casual", "outdoor"],
		season: ["winter"],
		fit: "regular",
		pattern: "quilted",
		details: ["zipper", "pockets"],
		features: ["insulated", "water-resistant"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-outerwear-006",
		category: "outerwear",
		name: "Black oversized blazer",
		brand: "Zara",
		colors: ["black"],
		material: "wool blend",
		style: ["business-casual", "minimalist"],
		season: ["all-season"],
		fit: "oversized",
		pattern: "solid",
		details: ["notch-lapel", "single-button"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-outerwear-007",
		category: "outerwear",
		name: "Sage green satin bomber jacket",
		brand: "Zara",
		colors: ["sage green"],
		material: "satin",
		style: ["casual", "trendy"],
		season: ["fall"],
		fit: "regular",
		pattern: "solid",
		details: ["zipper", "ribbed-cuffs"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-outerwear-008",
		category: "outerwear",
		name: "Gray long open-front cardigan",
		brand: "H&M",
		colors: ["gray"],
		material: "knit",
		style: ["casual", "cozy"],
		season: ["fall", "winter"],
		fit: "long",
		pattern: "solid",
		details: ["open-front", "pockets"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-outerwear-009",
		category: "outerwear",
		name: "Brown teddy sherpa coat",
		brand: "Mango",
		colors: ["brown"],
		material: "sherpa",
		style: ["casual", "cozy"],
		season: ["winter"],
		fit: "oversized",
		pattern: "solid",
		details: ["zipper", "pockets"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-outerwear-010",
		category: "outerwear",
		name: "Yellow waterproof rain jacket",
		brand: "Stutterheim",
		colors: ["yellow"],
		material: "rubber",
		style: ["casual", "outdoor"],
		season: ["spring", "fall"],
		fit: "regular",
		pattern: "solid",
		details: ["button-front", "hood"],
		features: ["waterproof"],
		gender: "women",
		tier: 2,
	},

	// ======================
	// WOMEN'S DRESSES (10 items)
	// ======================
	{
		id: "women-dress-001",
		category: "dress",
		name: "Little black dress",
		brand: "Zara",
		colors: ["black"],
		material: "polyester",
		style: ["elegant", "night-out"],
		season: ["all-season"],
		fit: "bodycon",
		pattern: "solid",
		details: ["knee-length"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-dress-002",
		category: "dress",
		name: "Floral wrap midi dress",
		brand: "Mango",
		colors: ["pink", "green"],
		material: "viscose",
		style: ["feminine", "romantic"],
		season: ["spring", "summer"],
		fit: "wrap",
		pattern: "floral",
		details: ["midi-length", "v-neck"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-003",
		category: "dress",
		name: "White cotton slip maxi dress",
		brand: "Everlane",
		colors: ["white"],
		material: "cotton",
		style: ["minimalist", "casual"],
		season: ["summer"],
		fit: "slip",
		pattern: "solid",
		details: ["maxi-length", "spaghetti-strap"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-004",
		category: "dress",
		name: "Gray oversized knit sweater dress",
		brand: "COS",
		colors: ["gray"],
		material: "knit",
		style: ["casual", "cozy"],
		season: ["fall", "winter"],
		fit: "oversized",
		pattern: "solid",
		details: ["midi-length", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-005",
		category: "dress",
		name: "Striped cotton shirt dress",
		brand: "Zara",
		colors: ["navy", "white"],
		material: "cotton",
		style: ["casual", "preppy"],
		season: ["spring", "summer"],
		fit: "regular",
		pattern: "striped",
		details: ["midi-length", "button-front", "collar"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-006",
		category: "dress",
		name: "Black silk slip dress",
		brand: "Mango",
		colors: ["black"],
		material: "silk",
		style: ["elegant", "minimalist"],
		season: ["all-season"],
		fit: "slip",
		pattern: "solid",
		details: ["midi-length", "bias-cut", "spaghetti-strap"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-007",
		category: "dress",
		name: "Beige linen midi dress",
		brand: "Everlane",
		colors: ["beige"],
		material: "linen",
		style: ["casual", "minimalist"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["midi-length", "sleeveless"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-008",
		category: "dress",
		name: "Navy sequin mini party dress",
		brand: "H&M",
		colors: ["navy"],
		material: "polyester",
		style: ["party", "glamorous"],
		season: ["all-season"],
		fit: "fitted",
		pattern: "sequin",
		details: ["mini-length", "sleeveless"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-009",
		category: "dress",
		name: "Burgundy wrap midi dress",
		brand: "Zara",
		colors: ["burgundy"],
		material: "polyester",
		style: ["elegant", "feminine"],
		season: ["fall"],
		fit: "wrap",
		pattern: "solid",
		details: ["midi-length", "v-neck", "long-sleeve"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-dress-010",
		category: "dress",
		name: "Button-front denim dress",
		brand: "Levi's",
		colors: ["medium blue"],
		material: "denim",
		style: ["casual"],
		season: ["spring", "summer"],
		fit: "regular",
		pattern: "solid",
		details: ["midi-length", "button-front", "collar"],
		gender: "women",
		tier: 2,
	},

	// ======================
	// MEN'S SHOES (10 items)
	// ======================
	{
		id: "men-shoes-001",
		category: "shoes",
		name: "White leather sneakers",
		brand: "Adidas Stan Smith",
		colors: ["white"],
		material: "leather",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		pattern: "solid",
		gender: "men",
		tier: 1,
	},
	{
		id: "men-shoes-002",
		category: "shoes",
		name: "Black leather sneakers",
		brand: "Nike Air Force 1",
		colors: ["black"],
		material: "leather",
		style: ["casual", "streetwear"],
		season: ["all-season"],
		pattern: "solid",
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-003",
		category: "shoes",
		name: "Brown leather Chelsea boots",
		brand: "Thursday Boot Co.",
		colors: ["brown"],
		material: "leather",
		style: ["smart-casual", "business-casual"],
		season: ["fall", "winter"],
		pattern: "solid",
		details: ["elastic-side-panel"],
		gender: "men",
		tier: 1,
	},
	{
		id: "men-shoes-004",
		category: "shoes",
		name: "Black leather oxford dress shoes",
		brand: "H&M",
		colors: ["black"],
		material: "leather",
		style: ["formal", "business"],
		season: ["all-season"],
		pattern: "solid",
		details: ["lace-up"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-005",
		category: "shoes",
		name: "Navy canvas sneakers",
		brand: "Converse Chuck Taylor",
		colors: ["navy"],
		material: "canvas",
		style: ["casual", "classic"],
		season: ["all-season"],
		pattern: "solid",
		details: ["lace-up", "high-top"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-006",
		category: "shoes",
		name: "Gray mesh running shoes",
		brand: "Nike",
		colors: ["gray"],
		material: "mesh",
		style: ["athletic"],
		season: ["all-season"],
		pattern: "solid",
		features: ["breathable", "cushioned"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-007",
		category: "shoes",
		name: "Brown suede loafers",
		brand: "Mango",
		colors: ["brown"],
		material: "suede",
		style: ["smart-casual", "preppy"],
		season: ["spring", "fall"],
		pattern: "solid",
		details: ["slip-on"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-008",
		category: "shoes",
		name: "Sand suede desert boots",
		brand: "Clarks",
		colors: ["sand"],
		material: "suede",
		style: ["casual", "classic"],
		season: ["fall"],
		pattern: "solid",
		details: ["lace-up", "crepe-sole"],
		gender: "men",
		tier: 2,
	},
	{
		id: "men-shoes-009",
		category: "shoes",
		name: "Black leather sandals",
		brand: "Birkenstock Arizona",
		colors: ["black"],
		material: "leather",
		style: ["casual"],
		season: ["summer"],
		pattern: "solid",
		details: ["two-strap"],
		gender: "men",
		tier: 3,
	},
	{
		id: "men-shoes-010",
		category: "shoes",
		name: "Black canvas slip-on sneakers",
		brand: "Vans",
		colors: ["black"],
		material: "canvas",
		style: ["casual", "skatewear"],
		season: ["all-season"],
		pattern: "solid",
		details: ["slip-on"],
		gender: "men",
		tier: 2,
	},

	// ======================
	// WOMEN'S SHOES (10 items)
	// ======================
	{
		id: "women-shoes-001",
		category: "shoes",
		name: "White leather sneakers",
		brand: "Adidas Stan Smith",
		colors: ["white"],
		material: "leather",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		pattern: "solid",
		gender: "women",
		tier: 1,
	},
	{
		id: "women-shoes-002",
		category: "shoes",
		name: "Black leather ankle boots",
		brand: "Zara",
		colors: ["black"],
		material: "leather",
		style: ["casual", "edgy"],
		season: ["fall", "winter"],
		pattern: "solid",
		details: ["block-heel", "side-zipper"],
		gender: "women",
		tier: 1,
	},
	{
		id: "women-shoes-003",
		category: "shoes",
		name: "Brown leather knee-high boots",
		brand: "Mango",
		colors: ["brown"],
		material: "leather",
		style: ["elegant", "classic"],
		season: ["fall", "winter"],
		pattern: "solid",
		details: ["block-heel", "side-zipper"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-004",
		category: "shoes",
		name: "Black leather ballet flats",
		brand: "Everlane",
		colors: ["black"],
		material: "leather",
		style: ["minimalist", "classic"],
		season: ["all-season"],
		pattern: "solid",
		details: ["round-toe"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-005",
		category: "shoes",
		name: "Tan leather sandals",
		brand: "Birkenstock Arizona",
		colors: ["tan"],
		material: "leather",
		style: ["casual"],
		season: ["summer"],
		pattern: "solid",
		details: ["two-strap"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-006",
		category: "shoes",
		name: "Black leather pointed-toe stiletto heels",
		brand: "Zara",
		colors: ["black"],
		material: "leather",
		style: ["elegant", "formal"],
		season: ["all-season"],
		pattern: "solid",
		details: ["pointed-toe", "stiletto-heel"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-007",
		category: "shoes",
		name: "White and pink mesh running shoes",
		brand: "Nike",
		colors: ["white", "pink"],
		material: "mesh",
		style: ["athletic"],
		season: ["all-season"],
		pattern: "solid",
		features: ["breathable", "cushioned"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-008",
		category: "shoes",
		name: "Brown leather loafers",
		brand: "COS",
		colors: ["brown"],
		material: "leather",
		style: ["minimalist", "smart-casual"],
		season: ["all-season"],
		pattern: "solid",
		details: ["slip-on"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-009",
		category: "shoes",
		name: "White leather mules",
		brand: "Everlane",
		colors: ["white"],
		material: "leather",
		style: ["minimalist", "casual"],
		season: ["spring", "summer"],
		pattern: "solid",
		details: ["backless", "low-heel"],
		gender: "women",
		tier: 2,
	},
	{
		id: "women-shoes-010",
		category: "shoes",
		name: "White canvas platform sneakers",
		brand: "Converse",
		colors: ["white"],
		material: "canvas",
		style: ["casual", "trendy"],
		season: ["all-season"],
		pattern: "solid",
		details: ["platform-sole", "lace-up"],
		gender: "women",
		tier: 2,
	},

	// ======================
	// ACCESSORIES - UNISEX (15 items)
	// ======================
	{
		id: "accessory-001",
		category: "accessory",
		name: "Classic black leather belt",
		brand: "Uniqlo",
		colors: ["black"],
		material: "leather",
		style: ["classic", "minimalist"],
		season: ["all-season"],
		pattern: "solid",
		details: ["simple-buckle"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-002",
		category: "accessory",
		name: "Brown leather dress belt",
		brand: "H&M",
		colors: ["brown"],
		material: "leather",
		style: ["formal", "classic"],
		season: ["all-season"],
		pattern: "solid",
		details: ["silver-buckle"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-003",
		category: "accessory",
		name: "Beige canvas tote bag",
		brand: "Everlane",
		colors: ["beige"],
		material: "canvas",
		style: ["casual", "eco-friendly"],
		season: ["all-season"],
		pattern: "solid",
		details: ["shoulder-straps"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-004",
		category: "accessory",
		name: "Black leather crossbody bag",
		brand: "Zara",
		colors: ["black"],
		material: "leather",
		style: ["casual", "minimalist"],
		season: ["all-season"],
		pattern: "solid",
		details: ["adjustable-strap", "zipper"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-005",
		category: "accessory",
		name: "Navy backpack",
		brand: "Herschel",
		colors: ["navy"],
		material: "polyester",
		style: ["casual", "functional"],
		season: ["all-season"],
		pattern: "solid",
		details: ["laptop-compartment", "padded-straps"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-006",
		category: "accessory",
		name: "Gray wool scarf",
		brand: "Uniqlo",
		colors: ["gray"],
		material: "wool",
		style: ["classic", "cozy"],
		season: ["winter"],
		pattern: "solid",
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-007",
		category: "accessory",
		name: "Black knit beanie",
		brand: "H&M",
		colors: ["black"],
		material: "knit",
		style: ["casual", "streetwear"],
		season: ["winter"],
		pattern: "solid",
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-008",
		category: "accessory",
		name: "Black cotton baseball cap",
		brand: "Nike",
		colors: ["black"],
		material: "cotton",
		style: ["casual", "athletic"],
		season: ["summer"],
		pattern: "solid",
		details: ["adjustable-strap"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-009",
		category: "accessory",
		name: "Black aviator sunglasses",
		brand: "Ray-Ban",
		colors: ["black"],
		material: "metal",
		style: ["classic", "cool"],
		season: ["summer"],
		pattern: "solid",
		details: ["UV-protection"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-010",
		category: "accessory",
		name: "Silver minimalist watch",
		brand: "Daniel Wellington",
		colors: ["silver"],
		material: "stainless steel",
		style: ["minimalist", "elegant"],
		season: ["all-season"],
		pattern: "solid",
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-011",
		category: "accessory",
		name: "Brown leather wallet",
		brand: "Fossil",
		colors: ["brown"],
		material: "leather",
		style: ["classic"],
		season: ["all-season"],
		pattern: "solid",
		details: ["bifold", "card-slots"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-012",
		category: "accessory",
		name: "Navy and white striped canvas tote bag",
		brand: "Gap",
		colors: ["navy", "white"],
		material: "canvas",
		style: ["casual", "nautical"],
		season: ["summer"],
		pattern: "striped",
		details: ["shoulder-straps"],
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-013",
		category: "accessory",
		name: "Beige cotton bucket hat",
		brand: "Uniqlo",
		colors: ["beige"],
		material: "cotton",
		style: ["casual", "trendy"],
		season: ["summer"],
		pattern: "solid",
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-014",
		category: "accessory",
		name: "Floral silk scarf",
		brand: "Zara",
		colors: ["pink", "green"],
		material: "silk",
		style: ["elegant", "feminine"],
		season: ["spring"],
		pattern: "floral",
		gender: "unisex",
		tier: 2,
	},
	{
		id: "accessory-015",
		category: "accessory",
		name: "Black faux-leather belt bag",
		brand: "H&M",
		colors: ["black"],
		material: "faux-leather",
		style: ["casual", "hands-free"],
		season: ["all-season"],
		pattern: "solid",
		details: ["adjustable-strap", "zipper"],
		gender: "unisex",
		tier: 2,
	},

	// ======================
	// SPECIAL CATEGORIES (10 items)
	// ======================
	{
		id: "special-001",
		category: "outerwear",
		name: "Charcoal wool suit jacket",
		brand: "H&M",
		colors: ["charcoal"],
		material: "wool",
		style: ["formal", "business"],
		season: ["all-season"],
		fit: "tailored",
		pattern: "solid",
		details: ["notch-lapel", "two-button"],
		gender: "men",
		tier: 3,
	},
	{
		id: "special-002",
		category: "bottom",
		name: "Charcoal wool suit pants",
		brand: "H&M",
		colors: ["charcoal"],
		material: "wool",
		style: ["formal", "business"],
		season: ["all-season"],
		fit: "tailored",
		pattern: "solid",
		details: ["flat-front", "creased"],
		gender: "men",
		tier: 3,
	},
	{
		id: "special-003",
		category: "accessory",
		name: "Navy silk tie",
		brand: "Brooks Brothers",
		colors: ["navy"],
		material: "silk",
		style: ["formal", "business"],
		season: ["all-season"],
		pattern: "solid",
		gender: "men",
		tier: 3,
	},
	{
		id: "special-004",
		category: "bottom",
		name: "Black athletic running shorts",
		brand: "Nike",
		colors: ["black"],
		material: "polyester",
		style: ["athletic"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["elastic-waist", "drawstring"],
		features: ["breathable", "moisture-wicking"],
		gender: "men",
		tier: 3,
	},
	{
		id: "special-005",
		category: "top",
		name: "Black sports bra",
		brand: "Lululemon",
		colors: ["black"],
		material: "nylon",
		style: ["athletic"],
		season: ["all-season"],
		fit: "fitted",
		pattern: "solid",
		details: ["racerback"],
		features: ["moisture-wicking", "support"],
		gender: "women",
		tier: 3,
	},
	{
		id: "special-006",
		category: "top",
		name: "White athletic tank top",
		brand: "Adidas",
		colors: ["white"],
		material: "polyester",
		style: ["athletic"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["racerback", "sleeveless"],
		features: ["breathable", "moisture-wicking"],
		gender: "women",
		tier: 3,
	},
	{
		id: "special-007",
		category: "dress",
		name: "Black one-piece swimsuit",
		brand: "Speedo",
		colors: ["black"],
		material: "nylon",
		style: ["athletic", "swimwear"],
		season: ["summer"],
		fit: "fitted",
		pattern: "solid",
		features: ["chlorine-resistant", "quick-dry"],
		gender: "women",
		tier: 3,
	},
	{
		id: "special-008",
		category: "bottom",
		name: "Navy swim trunks",
		brand: "Speedo",
		colors: ["navy"],
		material: "polyester",
		style: ["athletic", "swimwear"],
		season: ["summer"],
		fit: "regular",
		pattern: "solid",
		details: ["elastic-waist", "drawstring"],
		features: ["quick-dry"],
		gender: "men",
		tier: 3,
	},
	{
		id: "special-009",
		category: "outerwear",
		name: "White cotton terry bathrobe",
		brand: "Pottery Barn",
		colors: ["white"],
		material: "cotton terry",
		style: ["loungewear", "home"],
		season: ["all-season"],
		fit: "relaxed",
		pattern: "solid",
		details: ["belt", "pockets"],
		gender: "unisex",
		tier: 3,
	},
	{
		id: "special-010",
		category: "top",
		name: "Striped cotton pajama set",
		brand: "Gap",
		colors: ["blue", "white"],
		material: "cotton",
		style: ["loungewear", "sleepwear"],
		season: ["all-season"],
		fit: "relaxed",
		pattern: "striped",
		details: ["button-front", "long-sleeve"],
		gender: "unisex",
		tier: 3,
	},
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a detailed prompt for AI image generation
 */
function buildImagePrompt(item: ClothingItem): string {
	const colorList = item.colors.join(" and ");
	const styleList = item.style.join(", ");
	const detailsList = item.details ? item.details.join(", ") : "";

	return `Professional e-commerce product photography of a ${colorList} ${item.name} by ${item.brand}.

Product Details:
- Category: ${item.category}
- Material: ${item.material}
- Style: ${styleList}
- Pattern: ${item.pattern || "none"}
${item.fit ? `- Fit: ${item.fit}` : ""}
${detailsList ? `- Details: ${detailsList}` : ""}
${item.features ? `- Features: ${item.features.join(", ")}` : ""}

Photography Requirements:
- Clean white background
- Professional studio lighting
- High-quality product photography style
- Item should be clearly visible and centered
- Show accurate colors and material texture
- ${item.category === "shoes" ? "Side view showing full profile" : item.category === "dress" || item.category === "outerwear" ? "Front view on hanger or mannequin" : "Flat lay from above"}
- Sharp focus with natural shadows
- No text or watermarks
- Photorealistic, commercial quality

The image should look like a professional product photo from an online clothing store like Zara, H&M, or Everlane.`;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
	const logger = createLogger({
		name: "generate-clothing-items",
		level: "info",
	});

	// Filter items by gender configuration
	let itemsToGenerate = CLOTHING_ITEMS;
	if (GENDER_FILTER !== "all") {
		itemsToGenerate = CLOTHING_ITEMS.filter(
			(item) => item.gender === GENDER_FILTER || item.gender === "unisex"
		);
		logger.info({
			msg: `Filtering items by gender: ${GENDER_FILTER}`,
			originalCount: CLOTHING_ITEMS.length,
			filteredCount: itemsToGenerate.length,
		});
	}

	logger.info({
		msg: "Starting clothing item image generation",
		totalItems: itemsToGenerate.length,
		genderFilter: GENDER_FILTER,
	});

	// Initialize AI client
	const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error(
			"GOOGLE_GEMINI_API_KEY environment variable is required. Please set it in your .env file."
		);
	}

	const aiClient = createAiClient({
		logger,
		providerConfigs: {
			googleGeminiApiKey: apiKey,
		},
		environment: "development",
	});

	// Create output directory
	const outputDir = path.join(process.cwd(), "_data", "generated-items");
	fs.mkdirSync(outputDir, { recursive: true });

	const results: Array<{
		id: string;
		name: string;
		status: "success" | "error";
		filePath?: string;
		error?: string;
	}> = [];

	// Process items sequentially with 2 second delay
	for (let i = 0; i < itemsToGenerate.length; i++) {
		const item = itemsToGenerate[i];
		const progress = `[${i + 1}/${itemsToGenerate.length}]`;

		logger.info({
			msg: `${progress} Generating: ${item.name} (${item.brand})`,
			itemId: item.id,
			category: item.category,
		});

		try {
			// Build prompt
			const prompt = buildImagePrompt(item);

			// Generate image using Gemini 2.5 Flash Image (multimodal)
			const result = await aiClient.generateText({
				model: aiClient.getModel({
					provider: "google",
					modelId: "gemini-2.5-flash-image-preview",
				}),
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				providerOptions: {
					google: {
						aspectRatio: "3:4", // Vertical product photo
						imageSize: "2K",
					},
				},
			});

			// Extract generated image from files array
			if (!result.files || result.files.length === 0) {
				throw new Error(
					"No files returned in response. Ensure the model supports image generation."
				);
			}

			const generatedImageFile = result.files.find((file) =>
				file.mediaType?.startsWith("image/")
			);

			if (!generatedImageFile?.base64) {
				throw new Error(
					`No image found in response. Received ${result.files.length} file(s) with media types: ${result.files.map((f) => f.mediaType).join(", ")}`
				);
			}

			// Decode base64 image data
			const imageBuffer = Buffer.from(generatedImageFile.base64, "base64");

			// Create gender/category directory hierarchy
			const genderDir = path.join(outputDir, item.gender);
			const categoryDir = path.join(genderDir, item.category);
			fs.mkdirSync(categoryDir, { recursive: true });

			// Save image
			const filename = `${sanitizeFilename(`${item.brand}-${item.name}`)}.webp`;
			const filePath = path.join(categoryDir, filename);
			fs.writeFileSync(filePath, imageBuffer);

			logger.info({
				msg: `${progress} ✓ Saved: ${filename}`,
				size: imageBuffer.length,
			});

			results.push({
				id: item.id,
				name: item.name,
				status: "success",
				filePath: path.relative(outputDir, filePath),
			});
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error({
				msg: `${progress} ✗ Failed: ${item.name}`,
				error: errorMsg,
				itemId: item.id,
			});

			results.push({
				id: item.id,
				name: item.name,
				status: "error",
				error: errorMsg,
			});
		}

		// Wait 2 seconds before next generation (rate limiting)
		if (i < itemsToGenerate.length - 1) {
			await sleep(2000);
		}
	}

	// Save metadata - main file with all generated items
	const metadataPath = path.join(outputDir, "metadata.json");
	fs.writeFileSync(
		metadataPath,
		JSON.stringify(
			{
				items: itemsToGenerate,
				results,
				genderFilter: GENDER_FILTER,
				generatedAt: new Date().toISOString(),
			},
			null,
			2
		)
	);

	// Save gender-specific metadata files
	const genders = ["men", "women", "unisex"] as const;
	for (const gender of genders) {
		const genderItems = itemsToGenerate.filter(
			(item) => item.gender === gender
		);
		if (genderItems.length > 0) {
			const genderDir = path.join(outputDir, gender);
			fs.mkdirSync(genderDir, { recursive: true });

			const genderMetadataPath = path.join(genderDir, "metadata.json");
			const genderResults = results.filter((r) =>
				genderItems.some((item) => item.id === r.id)
			);

			fs.writeFileSync(
				genderMetadataPath,
				JSON.stringify(
					{
						gender,
						items: genderItems,
						results: genderResults,
						generatedAt: new Date().toISOString(),
					},
					null,
					2
				)
			);
		}
	}

	// Save generation log
	const logPath = path.join(outputDir, "generation-log.txt");
	const successCount = results.filter((r) => r.status === "success").length;
	const errorCount = results.filter((r) => r.status === "error").length;

	const logContent = `
==============================================
CLOTHING ITEM IMAGE GENERATION LOG
==============================================
Generated: ${new Date().toISOString()}
Gender Filter: ${GENDER_FILTER}
Total Items: ${itemsToGenerate.length}
Successful: ${successCount}
Failed: ${errorCount}
Output Directory: ${outputDir}

RESULTS:
${results
	.map(
		(r) =>
			`${r.status === "success" ? "✓" : "✗"} ${r.id} - ${r.name} ${r.status === "error" ? `(${r.error})` : ""}`
	)
	.join("\n")}
==============================================
`;

	fs.writeFileSync(logPath, logContent);

	// Final summary
	logger.info({
		msg: "Image generation complete",
		genderFilter: GENDER_FILTER,
		total: itemsToGenerate.length,
		successful: successCount,
		failed: errorCount,
		outputDir,
	});

	console.log("\n" + logContent);
}

// Run the script
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
