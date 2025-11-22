export const NUMERIC_CONSTANTS = {
	MAX_DELAY: 1000,
	SEVEN_DAYS: 7,
	validationLimits: {
		minStringLength: 1,
		passwordMinLength: 8,
	},
};

// Field Length Limits
export const FIELD_LIMITS = {
	minLength: 1,
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
