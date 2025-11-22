"use client";

import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { Card } from "../ui/card";

type UploadDropzoneProps = {
	onFilesSelect: (files: File[]) => void;
	disabled?: boolean;
	maxFiles?: number;
	accept?: string;
};

export function UploadDropzone({
	onFilesSelect,
	disabled = false,
	maxFiles = 10,
	accept = "image/*",
}: UploadDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false);

	const validateFiles = (files: FileList): File[] => {
		const validFiles: File[] = [];
		const maxSize = 10 * 1024 * 1024; // 10MB

		for (let i = 0; i < files.length && validFiles.length < maxFiles; i++) {
			const file = files[i];

			if (!file.type.startsWith("image/")) {
				continue;
			}

			if (file.size > maxSize) {
				continue;
			}

			validFiles.push(file);
		}

		return validFiles;
	};

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			if (disabled) return;

			const files = validateFiles(e.dataTransfer.files);
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
			const validFiles = validateFiles(files);
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
				!disabled && !isDragging && "cursor-pointer hover:border-primary/50"
			)}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onClick={() => {
				if (!disabled) {
					document.getElementById("file-input-dropzone")?.click();
				}
			}}
		>
			<input
				id="file-input-dropzone"
				type="file"
				accept={accept}
				multiple
				onChange={handleFileInput}
				className="hidden"
				disabled={disabled}
				aria-label="Upload clothing images"
			/>

			<div className="flex flex-col items-center gap-4 text-center">
				<div className="rounded-full bg-muted p-4">
					<Upload className="h-8 w-8 text-muted-foreground" />
				</div>

				<div className="space-y-2">
					<p className="text-sm font-medium">
						{isDragging ? "Drop images here" : "Drag & drop images here"}
					</p>
					<p className="text-xs text-muted-foreground">
						or click to browse (max {maxFiles} files, 10MB each)
					</p>
				</div>
			</div>
		</Card>
	);
}
