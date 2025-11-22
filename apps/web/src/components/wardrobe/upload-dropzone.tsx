"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card } from "../ui/card";

type UploadDropzoneProps = {
	onFilesSelect: (files: File[]) => void;
	disabled?: boolean;
	maxFiles?: number;
	accept?: string;
};

const validateFiles = (files: FileList, maxFiles: number): File[] => {
	const validFiles: File[] = [];

	for (let i = 0; i < files.length && validFiles.length < maxFiles; i += 1) {
		const file = files[i];

		if (!file.type.startsWith("image/")) {
			continue;
		}

		if (file.size > MAX_UPLOAD_SIZE_BYTES) {
			continue;
		}

		validFiles.push(file);
	}

	return validFiles;
};

export function UploadDropzone({
	onFilesSelect,
	disabled = false,
	maxFiles = 10,
	accept = "image/*",
}: UploadDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			if (disabled) {
				return;
			}

			const files = validateFiles(e.dataTransfer.files, maxFiles);
			if (files.length > 0) {
				onFilesSelect(files);
			}
		},
		[disabled, onFilesSelect, maxFiles]
	);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDragEnter = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (!disabled) {
				setIsDragging(true);
			}
		},
		[disabled]
	);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();

		// Only set dragging to false if we're leaving the dropzone entirely
		if (e.currentTarget === e.target) {
			setIsDragging(false);
		}
	}, []);

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
			const validFiles = validateFiles(files, maxFiles);
			if (validFiles.length > 0) {
				onFilesSelect(validFiles);
			}
		}
		// Reset input
		e.target.value = "";
	};

	return (
		<Card
			className={cn(
				"relative flex flex-col items-center justify-center border-2 border-dashed p-12 transition-colors",
				isDragging && "border-primary bg-primary/5",
				disabled && "cursor-not-allowed opacity-50",
				!(disabled || isDragging) && "cursor-pointer hover:border-primary/50"
			)}
			onClick={() => {
				if (!disabled) {
					document.getElementById("file-input-dropzone")?.click();
				}
			}}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<input
				accept={accept}
				aria-label="Upload clothing images"
				className="hidden"
				disabled={disabled}
				id="file-input-dropzone"
				multiple
				onChange={handleFileInput}
				type="file"
			/>

			<div className="flex flex-col items-center gap-4 text-center">
				<div className="rounded-full bg-muted p-4">
					<Upload className="h-8 w-8 text-muted-foreground" />
				</div>

				<div className="space-y-2">
					<p className="font-medium text-sm">
						{isDragging ? "Drop images here" : "Drag & drop images here"}
					</p>
					<p className="text-muted-foreground text-xs">
						or click to browse (max {maxFiles} files, 10MB each)
					</p>
				</div>
			</div>
		</Card>
	);
}
