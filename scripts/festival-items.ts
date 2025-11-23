/**
 * Festival/Rave Outfit Definitions
 * Color theme: Red, Yellow, Purple, Orange
 */

export type FestivalItem = {
	id: string
	category: "top" | "bottom" | "shoes" | "accessory" | "outerwear" | "dress"
	name: string
	colors: string[]
	style: string[]
	prompt: string
	gender: "men" | "women" | "unisex"
}

export const festivalItems: FestivalItem[] = [
	// Tops/Outerwear (5 items)
	{
		id: "festival-top-001",
		category: "top",
		name: "Holographic Crop Top",
		colors: ["purple", "orange"],
		style: ["rave", "festival", "holographic"],
		gender: "unisex",
		prompt:
			"Professional product photo of a holographic iridescent crop top with purple and orange reflective shimmer, rave festival fashion, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-top-002",
		category: "top",
		name: "Mesh Festival Tank",
		colors: ["red", "yellow"],
		style: ["rave", "festival", "mesh"],
		gender: "unisex",
		prompt:
			"Professional product photo of a vibrant mesh festival tank top with red and yellow neon colors, breathable rave wear, see-through mesh fabric, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-outerwear-001",
		category: "outerwear",
		name: "LED Light-Up Jacket",
		colors: ["red", "yellow", "purple", "orange"],
		style: ["rave", "festival", "led", "futuristic"],
		gender: "unisex",
		prompt:
			"Professional product photo of a futuristic LED light-up jacket with integrated fiber optic strips in red, yellow, purple, and orange colors, rave festival outerwear, glowing neon lights, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-top-003",
		category: "top",
		name: "Sequin Festival Top",
		colors: ["orange", "purple"],
		style: ["rave", "festival", "sequin", "sparkle"],
		gender: "women",
		prompt:
			"Professional product photo of a sparkly sequin festival crop top with orange and purple sequins, rave party wear, shimmering texture, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-top-004",
		category: "top",
		name: "Metallic Bodysuit Top",
		colors: ["yellow", "red"],
		style: ["rave", "festival", "metallic", "futuristic"],
		gender: "women",
		prompt:
			"Professional product photo of a metallic bodysuit top in yellow and red gradient, futuristic rave fashion, shiny reflective fabric, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},

	// Bottoms (4 items)
	{
		id: "festival-bottom-001",
		category: "bottom",
		name: "Neon Rave Pants",
		colors: ["purple", "yellow"],
		style: ["rave", "festival", "neon", "wide-leg"],
		gender: "unisex",
		prompt:
			"Professional product photo of neon rave pants with purple and yellow stripes, wide-leg festival pants, vibrant UV reactive colors, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-bottom-002",
		category: "bottom",
		name: "Holographic Festival Shorts",
		colors: ["orange", "red"],
		style: ["rave", "festival", "holographic", "shorts"],
		gender: "unisex",
		prompt:
			"Professional product photo of holographic festival shorts with orange and red iridescent shimmer, high-waisted rave shorts, reflective fabric, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-bottom-003",
		category: "bottom",
		name: "LED Strip Leggings",
		colors: ["red", "yellow", "purple", "orange"],
		style: ["rave", "festival", "led", "futuristic"],
		gender: "women",
		prompt:
			"Professional product photo of black leggings with LED light strips in red, yellow, purple, and orange running down the sides, futuristic rave wear, glowing neon accents, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-bottom-004",
		category: "bottom",
		name: "Festival Fringe Skirt",
		colors: ["red", "purple"],
		style: ["rave", "festival", "fringe", "flowing"],
		gender: "women",
		prompt:
			"Professional product photo of a flowing festival skirt with long fringe tassels in red and purple colors, rave party wear, movement-friendly design, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},

	// Shoes/Accessories (4 items)
	{
		id: "festival-shoes-001",
		category: "shoes",
		name: "LED Platform Boots",
		colors: ["purple", "yellow"],
		style: ["rave", "festival", "platform", "led"],
		gender: "unisex",
		prompt:
			"Professional product photo of chunky platform boots with LED lights in the sole and sides, purple and yellow color accents, futuristic rave footwear, glowing effects, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-accessory-001",
		category: "accessory",
		name: "Glow Accessories Pack",
		colors: ["red", "yellow", "purple", "orange"],
		style: ["rave", "festival", "glow", "neon"],
		gender: "unisex",
		prompt:
			"Professional product photo of a rave accessories pack including glow stick bracelets, necklaces, and rings in red, yellow, purple, and orange colors, festival party accessories, neon glow effects, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-accessory-002",
		category: "accessory",
		name: "Holographic Festival Bag",
		colors: ["orange", "purple"],
		style: ["rave", "festival", "holographic", "bag"],
		gender: "unisex",
		prompt:
			"Professional product photo of a holographic crossbody festival bag with orange and purple iridescent shimmer, reflective rave accessory, compact design with adjustable strap, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-accessory-003",
		category: "accessory",
		name: "LED Flower Crown",
		colors: ["red", "yellow"],
		style: ["rave", "festival", "led", "headpiece"],
		gender: "unisex",
		prompt:
			"Professional product photo of an LED flower crown headpiece with glowing red and yellow flowers, festival rave accessory, fiber optic petals, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},

	// Full Outfits/Dresses (4 items)
	{
		id: "festival-dress-001",
		category: "dress",
		name: "Festival Bodysuit",
		colors: ["red", "yellow", "purple", "orange"],
		style: ["rave", "festival", "bodysuit", "colorful"],
		gender: "women",
		prompt:
			"Professional product photo of a vibrant festival bodysuit with geometric patterns in red, yellow, purple, and orange colors, rave party outfit, form-fitting design with cutouts, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-dress-002",
		category: "dress",
		name: "Rave Dress with Cutouts",
		colors: ["purple", "orange"],
		style: ["rave", "festival", "dress", "cutout"],
		gender: "women",
		prompt:
			"Professional product photo of a rave mini dress with strategic cutouts, purple and orange color blocking, festival party wear, modern edgy design, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-dress-003",
		category: "dress",
		name: "Holographic Romper",
		colors: ["yellow", "red"],
		style: ["rave", "festival", "holographic", "romper"],
		gender: "women",
		prompt:
			"Professional product photo of a holographic romper playsuit with yellow and red iridescent shimmer, festival rave outfit, reflective fabric with shorts design, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
	{
		id: "festival-dress-004",
		category: "dress",
		name: "Festival Jumpsuit",
		colors: ["red", "purple"],
		style: ["rave", "festival", "jumpsuit", "bold"],
		gender: "unisex",
		prompt:
			"Professional product photo of a bold festival jumpsuit with red and purple gradient, rave party outfit, wide-leg design with adjustable straps, clean white background, studio lighting, 3:4 vertical composition, high quality e-commerce style",
	},
]
