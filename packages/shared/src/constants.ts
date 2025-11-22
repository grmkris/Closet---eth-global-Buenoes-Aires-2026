import z from "zod";

export const NUMERIC_CONSTANTS = {
	MAX_DELAY: 1000,
	NONCE_LENGTH: 32,
	SEVEN_DAYS: 7,
	validationLimits: {
		minStringLength: 1,
	},
};

// Field Length Limits
export const FIELD_LIMITS = {
	minLength: 1,
	// AI field limits
	conversationTitle: 200,
	// Wardrobe field limits
	wardrobeItemName: 100,
	wardrobeDisplayName: 100,
	wardrobeModelVersion: 50,
	wardrobeHexCode: 7, // #RRGGBB
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
	INTERNAL_SERVER_ERROR: 500,
} as const;

// Server Configuration
export const SERVER_CONFIG = {
	IDLE_TIMEOUT_SECONDS: 60,
	DEFAULT_PORT: 3000,
} as const;

// API Limits
export const API_LIMITS = {
	MIN_BATCH_UPLOAD: 1,
	MAX_BATCH_UPLOAD: 50,
	MAX_ITEMS_PER_PAGE: 100,
	DEFAULT_ITEMS_PER_PAGE: 20,
	MAX_SEARCH_LENGTH: 100,
} as const;

// Worker Configuration
export const WORKER_CONFIG = {
	MAX_CONCURRENT_JOBS: 5,
	SIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;

// Polling Configuration
export const POLLING_CONFIG = {
	BASE_INTERVAL_MS: 2000, // Base polling interval (2s)
	PROCESSING_INTERVAL_MS: 5000, // Poll every 5s when items are processing
	BACKOFF_MULTIPLIER: 1.5, // Exponential backoff multiplier
	MAX_INTERVAL_MS: 30_000, // Maximum polling interval (30s)
} as const;

// UI Configuration
export const UI_CONFIG = {
	REDIRECT_DELAY_MS: 2000, // Delay before redirecting after successful action
	ADDRESS_PREFIX_LENGTH: 6, // Number of characters to show at start of wallet address
	ADDRESS_SUFFIX_LENGTH: 4, // Number of characters to show at end of wallet address
} as const;

// Wardrobe AI Context Constants
export const WARDROBE_AI_CONSTANTS = {
	// Season detection month boundaries (Northern Hemisphere, 0-indexed)
	SPRING_MONTH_START: 2, // March
	SPRING_MONTH_END: 4, // May
	SUMMER_MONTH_START: 5, // June
	SUMMER_MONTH_END: 7, // August
	FALL_MONTH_START: 8, // September
	FALL_MONTH_END: 10, // November

	// Query result limits for wardrobe context
	TOP_TAGS_LIMIT: 30, // Max tags to include in wardrobe context
	TOP_COLORS_LIMIT: 5, // Colors to include in summary
	TOP_TAGS_IN_SUMMARY: 15, // Tags to include in summary
	RECENT_ITEMS_LIMIT: 40, // Recent items to include in AI context with full metadata
} as const;

// Screen Size Constants
export const SCREEN_SIZE = {
	DESKTOP: 768,
} as const;

// Outfit Image Generation Configuration
export const OUTFIT_IMAGE_CONFIG = {
	SUPPORTED_ASPECT_RATIOS: [
		"1:1",
		"3:4",
		"4:3",
		"9:16",
		"16:9",
		"9:21",
		"21:9",
	] as const,
	OUTPUT_EXPIRY_SECONDS: 86_400, // 24 hours
} as const;

export const AspectRatio = z.enum(OUTFIT_IMAGE_CONFIG.SUPPORTED_ASPECT_RATIOS);
export type AspectRatio = z.infer<typeof AspectRatio>;

// Chain IDs
export const CHAIN_IDS = {
	POLYGON_MAINNET: 137,
	POLYGON_AMOY_TESTNET: 80_002,
} as const;

// USDC Contract Addresses by Chain ID
export const USDC_ADDRESSES = {
	[CHAIN_IDS.POLYGON_MAINNET]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon Mainnet
	[CHAIN_IDS.POLYGON_AMOY_TESTNET]:
		"0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", // Polygon Amoy Testnet
} as const;

// Wallet UI Configuration
export const WALLET_UI_CONFIG = {
	USDC_DECIMALS: 2, // Display decimals for USDC balance
	POL_DECIMALS: 4, // Display decimals for POL gas balance
	TOAST_COPY_TIMEOUT_MS: 2000, // Timeout for "copied" toast messages
} as const;
