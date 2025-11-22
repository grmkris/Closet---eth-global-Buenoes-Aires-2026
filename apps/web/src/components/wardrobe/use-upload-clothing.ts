"use client";

import { orpc } from "@/utils/orpc";
import { useState } from "react";
import { toast } from "sonner";

type UploadState = {
	uploading: boolean;
	error: string | null;
};

export function useUploadClothing() {
	const [state, setState] = useState<UploadState>({
		uploading: false,
		error: null,
	});

	const uploadMutation = orpc.wardrobe.upload.useMutation();
	const utils = orpc.useUtils();

	const upload = async (file: File) => {
		setState({ uploading: true, error: null });

		try {
			// Step 1: Request upload URL from backend
			const result = await uploadMutation.mutateAsync({
				contentType: file.type,
				fileName: file.name,
			});

			// Step 2: Upload file to S3 using presigned URL
			const uploadResponse = await fetch(result.uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type,
				},
				body: file,
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed: ${uploadResponse.statusText}`);
			}

			// Step 3: Invalidate wardrobe items to trigger refresh
			await utils.wardrobe.getItems.invalidate();

			toast.success("Image uploaded successfully", {
				description: "Processing will complete in a few seconds",
			});

			setState({ uploading: false, error: null });

			return result.itemId;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Upload failed";
			setState({ uploading: false, error: message });
			toast.error("Upload failed", { description: message });
			throw error;
		}
	};

	const uploadBatch = async (files: File[]) => {
		setState({ uploading: true, error: null });

		try {
			// Request upload URLs for all files
			const batchMutation = orpc.wardrobe.batchUpload.useMutation();

			const result = await batchMutation.mutateAsync({
				files: files.map((file) => ({
					contentType: file.type,
					fileName: file.name,
				})),
			});

			// Upload all files in parallel
			await Promise.all(
				result.items.map(async (item, index) => {
					const file = files[index];
					const uploadResponse = await fetch(item.uploadUrl, {
						method: "PUT",
						headers: {
							"Content-Type": file.type,
						},
						body: file,
					});

					if (!uploadResponse.ok) {
						throw new Error(
							`Upload failed for ${file.name}: ${uploadResponse.statusText}`
						);
					}
				})
			);

			// Invalidate to refresh list
			await utils.wardrobe.getItems.invalidate();

			toast.success(`${files.length} images uploaded successfully`, {
				description: "Processing will complete in a few seconds",
			});

			setState({ uploading: false, error: null });

			return result.items.map((item) => item.itemId);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Batch upload failed";
			setState({ uploading: false, error: message });
			toast.error("Upload failed", { description: message });
			throw error;
		}
	};

	return {
		upload,
		uploadBatch,
		uploading: state.uploading,
		error: state.error,
	};
}
