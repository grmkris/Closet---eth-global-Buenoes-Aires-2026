import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Test image fixtures for wardrobe testing
 * These are minimal PNG files for testing upload/processing
 */

// Base64 encoded 1x1 pixel PNGs in different colors for testing
export const TEST_IMAGES = {
	tShirt: {
		// Navy blue 1x1 PNG
		base64:
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
		filename: "test-tshirt.png",
		contentType: "image/png",
		description: "Navy t-shirt test image",
	},
	jeans: {
		// Dark blue 1x1 PNG
		base64:
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
		filename: "test-jeans.png",
		contentType: "image/png",
		description: "Dark blue jeans test image",
	},
	dress: {
		// Black 1x1 PNG
		base64:
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==",
		filename: "test-dress.png",
		contentType: "image/png",
		description: "Black dress test image",
	},
	sneakers: {
		// White 1x1 PNG
		base64:
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
		filename: "test-sneakers.png",
		contentType: "image/png",
		description: "White sneakers test image",
	},
	invalid: {
		// Invalid image data
		base64: "not-a-valid-base64-image",
		filename: "test-invalid.png",
		contentType: "image/png",
		description: "Invalid image for error testing",
	},
} as const;

/**
 * Get test image as Buffer
 */
export function getTestImageBuffer(imageKey: keyof typeof TEST_IMAGES): Buffer {
	const image = TEST_IMAGES[imageKey];
	return Buffer.from(image.base64, "base64");
}

/**
 * Get test image metadata
 */
export function getTestImageMetadata(imageKey: keyof typeof TEST_IMAGES) {
	return TEST_IMAGES[imageKey];
}

/**
 * Load actual image file from fixtures directory if it exists
 * Falls back to base64 test images
 */
export function loadTestImageFile(filename: string): Buffer | null {
	try {
		const filePath = join(__dirname, "images", filename);
		return readFileSync(filePath);
	} catch {
		return null;
	}
}

/**
 * Get all test image keys for iteration
 */
export function getTestImageKeys(): Array<keyof typeof TEST_IMAGES> {
	return Object.keys(TEST_IMAGES) as Array<keyof typeof TEST_IMAGES>;
}
