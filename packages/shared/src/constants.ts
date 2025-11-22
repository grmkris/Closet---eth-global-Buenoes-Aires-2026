export const NUMERIC_CONSTANTS = {
	MAX_DELAY: 1000,
	SEVEN_DAYS: 7,
	validationLimits: {
		minStringLength: 1,
		passwordMinLength: 8,
	},
};

// HTTP Status Codes
export const HTTP_STATUS = {
	INTERNAL_SERVER_ERROR: 500,
} as const;

// Server Configuration
export const SERVER_CONFIG = {
	IDLE_TIMEOUT_SECONDS: 60,
	DEFAULT_PORT: 8000,
} as const;

// Worker Configuration
export const WORKER_CONFIG = {
	MAX_CONCURRENT_JOBS: 5,
	SIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;
