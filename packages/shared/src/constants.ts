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
	DEFAULT_PORT: 8000,
} as const;

// API Limits
export const API_LIMITS = {
	MIN_BATCH_UPLOAD: 1,
	MAX_BATCH_UPLOAD: 50,
} as const;

// Worker Configuration
export const WORKER_CONFIG = {
	MAX_CONCURRENT_JOBS: 5,
	SIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;
