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
	/** Metadata about the input image */
	metadata: {
		format: string;
		width: number;
		height: number;
		size: number;
	};
};

/**
 * Convert image to WebP format and generate thumbnail using Sharp
 * Supports JPEG, PNG, and other common formats
 * Sharp automatically handles:
 * - EXIF rotation
 * - Color space conversion
 * - Optimization
 */
export async function convertImage(
	options: ConvertImageOptions
): Promise<ConvertImageResult> {
	const { inputBuffer, targetWidth = 2048, thumbnailWidth = 600 } = options;

	// Validate input buffer
	if (!inputBuffer || inputBuffer.length === 0) {
		throw new Error("Input buffer is empty or invalid");
	}

	// Get and validate image metadata before processing
	let metadata: sharp.Metadata;
	try {
		metadata = await sharp(inputBuffer).metadata();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Provide more helpful error messages for common issues
		if (message.includes("bad seek")) {
			throw new Error(
				`Image file appears to be corrupt or incomplete (bad seek errors). Original error: ${message}`
			);
		}
		throw new Error(`Failed to read image metadata: ${message}`);
	}

	// Validate image dimensions
	if (!(metadata.width && metadata.height)) {
		throw new Error(
			`Invalid image dimensions: ${metadata.width}x${metadata.height}`
		);
	}

	// Check for supported formats
	const supportedFormats = [
		"jpeg",
		"png",
		"webp",
		"tiff",
		"gif",
		"svg",
	];
	if (metadata.format && !supportedFormats.includes(metadata.format)) {
		throw new Error(
			`Unsupported image format: ${metadata.format}. Supported formats: ${supportedFormats.join(", ")}`
		);
	}

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
		metadata: {
			format: metadata.format || "unknown",
			width: metadata.width,
			height: metadata.height,
			size: inputBuffer.length,
		},
	};
}
