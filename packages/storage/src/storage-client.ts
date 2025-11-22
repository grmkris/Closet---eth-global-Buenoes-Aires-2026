import type { Logger } from "@ai-stilist/logger";
import { type Environment, SERVICE_URLS } from "@ai-stilist/shared/services";
import type { S3Client } from "bun";

export type StorageConfig = {
	s3Client: S3Client;
	env: Environment;
	logger?: Logger;
};

export type UploadOptions = {
	key: string;
	data: Buffer | Uint8Array | string;
	contentType: string;
};

export type DownloadOptions = {
	key: string;
};

export type DeleteOptions = {
	key: string;
};

export type ListOptions = {
	prefix?: string;
	maxKeys?: number;
};

export type SignedUrlOptions = {
	key: string;
	expiresIn?: number; // seconds
};

/**
 * Storage client abstraction over S3
 * Provides high-level methods for common storage operations
 */
export function createStorageClient(config: StorageConfig) {
	const { s3Client, logger } = config;

	/**
	 * Upload a file to storage
	 * Note: Content-Type is required and stored in S3 object metadata
	 * File extensions are NOT used in S3 keys - content type is the source of truth
	 */
	async function upload(options: UploadOptions): Promise<{ key: string }> {
		const { key, data, contentType } = options;

		try {
			logger?.debug({ msg: "Uploading file", key, contentType });

			await s3Client.write(key, data, {
				type: contentType,
			});

			logger?.info({ msg: "File uploaded successfully", key });

			return {
				key,
			};
		} catch (error) {
			logger?.error({ msg: "File upload failed", key, error });
			throw new Error(`Failed to upload file: ${key}`);
		}
	}

	/**
	 * Download a file from storage
	 */
	async function download(options: DownloadOptions): Promise<Blob> {
		const { key } = options;

		try {
			logger?.debug({ msg: "Downloading file", key });

			const file = await s3Client.file(key);
			const buf = new ArrayBuffer(file.size);
			const blob = new Blob([buf]);
			logger?.info({ msg: "File downloaded successfully", key });
			return blob;
		} catch (error) {
			logger?.error({ msg: "File download failed", key, error });
			throw new Error(`Failed to download file: ${key}`);
		}
	}

	/**
	 * Delete a file from storage
	 */
	async function deleteFile(options: DeleteOptions): Promise<void> {
		const { key } = options;

		try {
			logger?.debug({ msg: "Deleting file", key });

			await s3Client.delete(key);

			logger?.info({ msg: "File deleted successfully", key });
		} catch (error) {
			logger?.error({ msg: "File deletion failed", key, error });
			throw new Error(`Failed to delete file: ${key}`);
		}
	}

	/**
	 * List files in storage
	 * Note: Bun's S3Client doesn't provide a list method
	 * To implement this functionality, you would need to:
	 * 1. Use the AWS SDK directly (import @aws-sdk/client-s3)
	 * 2. Or use S3's REST API via presigned URLs
	 * 3. For development/testing, consider using MinIO's client which has list support
	 *
	 * @throws {Error} This operation is not currently supported
	 */
	function listObjects(options: ListOptions = {}): string[] {
		const { prefix = "", maxKeys = 1000 } = options;

		logger?.warn({
			msg: "List operation not supported by Bun S3Client",
			prefix,
			maxKeys,
		});

		throw new Error(
			"listObjects is not supported by Bun S3Client. Use AWS SDK for this functionality."
		);
	}

	/**
	 * Get a signed URL for temporary access
	 */
	function getSignedUrl(options: SignedUrlOptions): string {
		const { key, expiresIn = 3600 } = options;

		try {
			logger?.debug({ msg: "Generating signed URL", key, expiresIn });

			const signedUrl = s3Client.presign(key, {
				expiresIn,
				endpoint: SERVICE_URLS[config.env].storage,
			});

			logger?.info({ msg: "Signed URL generated", key });

			return signedUrl;
		} catch (error) {
			logger?.error({ msg: "Signed URL generation failed", key, error });
			throw new Error(`Failed to generate signed URL: ${key}`);
		}
	}

	/**
	 * Get a presigned URL for uploading a file
	 */
	function getUploadUrl(
		options: SignedUrlOptions & { contentType: string }
	): string {
		const { key, expiresIn = 3600, contentType } = options;

		try {
			logger?.debug({
				msg: "Generating upload URL",
				key,
				expiresIn,
				contentType,
			});

			const uploadUrl = s3Client.presign(key, {
				endpoint: SERVICE_URLS[config.env].storage,
				method: "PUT",
				expiresIn,
				type: contentType,
			});

			logger?.info({ msg: "Upload URL generated", key });

			return uploadUrl;
		} catch (error) {
			logger?.error({ msg: "Upload URL generation failed", key, error });
			throw new Error(`Failed to generate upload URL: ${key}`);
		}
	}

	/**
	 * Get multiple presigned URLs for batch upload
	 */
	function getBatchUploadUrls(
		keys: Array<{ key: string; contentType: string }>,
		expiresIn = 3600
	): Array<{ key: string; uploadUrl: string }> {
		try {
			logger?.debug({
				msg: "Generating batch upload URLs",
				count: keys.length,
				expiresIn,
			});

			const urls = keys.map(({ key, contentType }) => ({
				key,
				uploadUrl: getUploadUrl({ key, contentType, expiresIn }),
			}));

			logger?.info({ msg: "Batch upload URLs generated", count: urls.length });

			return urls;
		} catch (error) {
			logger?.error({ msg: "Batch upload URL generation failed", error });
			throw new Error("Failed to generate batch upload URLs");
		}
	}

	/**
	 * Check if a file exists
	 */
	async function exists(key: string): Promise<boolean> {
		try {
			logger?.debug({ msg: "Checking file existence", key });

			const file = s3Client.file(key);
			const fileExists = await file.exists();

			logger?.debug({ msg: "File existence check", key, exists: fileExists });

			return fileExists;
		} catch (error) {
			logger?.error({ msg: "File existence check failed", key, error });
			return false;
		}
	}

	return {
		upload,
		download,
		delete: deleteFile,
		listObjects,
		getSignedUrl,
		getUploadUrl,
		getBatchUploadUrls,
		exists,
	};
}

export type StorageClient = ReturnType<typeof createStorageClient>;
