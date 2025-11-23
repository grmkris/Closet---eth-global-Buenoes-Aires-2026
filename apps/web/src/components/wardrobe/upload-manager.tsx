"use client";

import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { CheckCircle, Loader2, X, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { client, orpc, queryClient } from "@/utils/orpc";
import { UploadDropzone } from "./upload-dropzone";

const UPLOAD_SUCCESS_DELAY_MS = 1000;

const getUploadVariant = (status: string) => {
	if (status === "success") {
		return "outline";
	}
	if (status === "error") {
		return "destructive";
	}
	return "default";
};

type UploadStatus = {
	id: string;
	fileName: string;
	status: "uploading" | "processing" | "success" | "error";
	progress: number;
	error?: string;
};

type UploadManagerProps = {
	onUploadStateChange?: (hasActiveUploads: boolean) => void;
};

export function UploadManager({
	onUploadStateChange,
}: UploadManagerProps = {}) {
	const [uploads, setUploads] = useState<UploadStatus[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	const handleFilesSelect = async (files: File[]) => {
		if (files.length === 0) {
			return;
		}

		setIsUploading(true);
		onUploadStateChange?.(true);

		// Initialize upload status for each file
		const newUploads: UploadStatus[] = files.map((file, index) => ({
			id: `${Date.now()}-${index}`,
			fileName: file.name,
			status: "uploading",
			progress: 0,
		}));

		setUploads((prev) => [...prev, ...newUploads]);

		try {
			// Get presigned URLs for all files
			const uploadRequests = files.map((file) => ({
				contentType: file.type,
				fileName: file.name,
			}));

			let uploadResponses: { itemId: ClothingItemId; uploadUrl: string }[] = [];

			if (files.length === 1) {
				// Single upload
				const response = await client.wardrobe.upload(uploadRequests[0]);
				uploadResponses = [
					{ itemId: response.itemId, uploadUrl: response.uploadUrl },
				];
			} else {
				// Batch upload
				const response = await client.wardrobe.batchUpload({
					files: uploadRequests,
				});
				uploadResponses = response.items.map((item) => ({
					itemId: item.itemId,
					uploadUrl: item.uploadUrl,
				}));
			}

			// Upload each file to S3
			const uploadPromises = files.map(async (file, index) => {
				const uploadId = newUploads[index].id;
				const { uploadUrl } = uploadResponses[index];

				try {
					// Upload to S3 using fetch with progress tracking
					const response = await fetch(uploadUrl, {
						method: "PUT",
						body: file,
						headers: {
							"Content-Type": file.type,
						},
					});

					if (!response.ok) {
						throw new Error(`Upload failed: ${response.statusText}`);
					}

					// Confirm upload to trigger background processing
					await client.wardrobe.confirmUpload({
						itemId: uploadResponses[index].itemId,
					});

					// Update status to processing
					setUploads((prev) =>
						prev.map((upload) =>
							upload.id === uploadId
								? { ...upload, status: "processing", progress: 100 }
								: upload
						)
					);

					// Wait a bit then mark as success
					// The actual processing will happen in background via BullMQ
					setTimeout(() => {
						setUploads((prev) =>
							prev.map((upload) =>
								upload.id === uploadId
									? { ...upload, status: "success" }
									: upload
							)
						);
					}, UPLOAD_SUCCESS_DELAY_MS);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Upload failed";

					setUploads((prev) =>
						prev.map((upload) =>
							upload.id === uploadId
								? { ...upload, status: "error", error: errorMessage }
								: upload
						)
					);

					throw error;
				}
			});

			await Promise.allSettled(uploadPromises);

			// Refresh the gallery to show new items
			queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});

			toast.success(
				`Successfully uploaded ${files.length} ${files.length === 1 ? "image" : "images"}`
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Upload failed";
			toast.error(errorMessage);
		} finally {
			setIsUploading(false);
			onUploadStateChange?.(false);
		}
	};

	const removeUpload = (id: string) => {
		setUploads((prev) => prev.filter((upload) => upload.id !== id));
	};

	const clearCompleted = () => {
		setUploads((prev) =>
			prev.filter(
				(upload) => upload.status !== "success" && upload.status !== "error"
			)
		);
	};

	return (
		<div className="space-y-4">
			{/* Upload Dropzone */}
			<UploadDropzone
				disabled={isUploading}
				maxFiles={10}
				onFilesSelect={handleFilesSelect}
			/>

			{/* Upload Status List */}
			{uploads.length > 0 && (
				<Card className="space-y-4 p-4">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-sm">
							Uploads ({uploads.length})
						</h3>
						{uploads.some(
							(u) => u.status === "success" || u.status === "error"
						) && (
							<Button
								disabled={isUploading}
								onClick={clearCompleted}
								size="sm"
								variant="ghost"
							>
								Clear completed
							</Button>
						)}
					</div>

					<div className="space-y-2">
						{uploads.map((upload) => (
							<div
								className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
								key={upload.id}
							>
								{/* Status Icon */}
								<div className="flex-shrink-0">
									{upload.status === "uploading" && (
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
									)}
									{upload.status === "processing" && (
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
									)}
									{upload.status === "success" && (
										<CheckCircle className="h-4 w-4 text-primary" />
									)}
									{upload.status === "error" && (
										<XCircle className="h-4 w-4 text-destructive" />
									)}
								</div>

								{/* File Info */}
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">
										{upload.fileName}
									</p>
									{upload.status === "uploading" && (
										<Progress className="mt-1 h-1" value={upload.progress} />
									)}
									{upload.status === "processing" && (
										<p className="text-muted-foreground text-xs">
											Analyzing with AI...
										</p>
									)}
									{upload.status === "error" && (
										<p className="text-destructive text-xs">
											{upload.error || "Upload failed"}
										</p>
									)}
								</div>

								{/* Status Badge */}
								<Badge
									className="flex-shrink-0"
									variant={getUploadVariant(upload.status)}
								>
									{upload.status}
								</Badge>

								{/* Remove Button */}
								{(upload.status === "success" || upload.status === "error") && (
									<Button
										className="flex-shrink-0"
										onClick={() => removeUpload(upload.id)}
										size="sm"
										variant="ghost"
									>
										<X className="h-4 w-4" />
									</Button>
								)}
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}
