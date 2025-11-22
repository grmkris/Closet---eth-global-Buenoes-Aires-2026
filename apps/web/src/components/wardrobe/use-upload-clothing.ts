"use client";

import { useState } from "react";
import { toast } from "sonner";
import { client, orpc, queryClient } from "@/utils/orpc";

type UploadState = {
	uploading: boolean;
	error: string | null;
};

export function useUploadClothing() {
	const [state, setState] = useState<UploadState>({
		uploading: false,
		error: null,
	});

	const upload = async (file: File) => {
		setState({ uploading: true, error: null });

		try {
			// Step 1: Request upload URL from backend
			const result = await client.wardrobe.upload({
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

			// Step 3: Confirm upload to trigger background processing
			await client.wardrobe.confirmUpload({
				itemId: result.itemId,
			});

			// Step 4: Invalidate wardrobe items to trigger refresh
			await queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});

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
			const result = await client.wardrobe.batchUpload({
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

					// Confirm upload to trigger background processing
					await client.wardrobe.confirmUpload({
						itemId: item.itemId,
					});
				})
			);

			// Invalidate to refresh list
			await queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});

			toast.success(`${files.length} images uploaded successfully`, {
				description: "Processing will complete in a few seconds",
			});

			setState({ uploading: false, error: null });

			return result.items.map((item) => item.itemId);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Batch upload failed";
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
