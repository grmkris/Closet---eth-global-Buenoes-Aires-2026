import sharp from "sharp";

export type ConvertImageOptions = {
	/** Input image buffer */
	inputBuffer: Buffer;
	/** Target width for full-size processed image (maintains aspect ratio) */
	targetWidth?: number;
	/** Target width for thumbnail */
	thumbnailWidth?: number;
};

export type ConvertImageResult = {
	/** Converted WebP image buffer (full size) */
	processedBuffer: Buffer;
	/** Thumbnail WebP image buffer */
	thumbnailBuffer: Buffer;
};

/**
 * Convert image to WebP format and generate thumbnail using Sharp
 * Supports HEIC, JPEG, PNG, and other formats
 * Sharp automatically handles:
 * - HEIC/HEIF decoding
 * - EXIF rotation
 * - Color space conversion
 * - Optimization
 */
export async function convertImage(
	options: ConvertImageOptions
): Promise<ConvertImageResult> {
	const { inputBuffer, targetWidth = 2048, thumbnailWidth = 600 } = options;

	// Convert to full-size WebP
	const processedBuffer = await sharp(inputBuffer)
		.resize(targetWidth, null, {
			withoutEnlargement: true, // Don't upscale small images
			fit: "inside", // Maintain aspect ratio
		})
		.webp({
			quality: 85, // High quality for full-size
			effort: 4, // Balance between compression time and file size
		})
		.toBuffer();

	// Generate thumbnail WebP
	const thumbnailBuffer = await sharp(inputBuffer)
		.resize(thumbnailWidth, thumbnailWidth, {
			withoutEnlargement: true,
			fit: "inside", // Maintain aspect ratio, won't crop
		})
		.webp({
			quality: 80, // Slightly lower quality for thumbnails
			effort: 4,
		})
		.toBuffer();

	return {
		processedBuffer,
		thumbnailBuffer,
	};
}
