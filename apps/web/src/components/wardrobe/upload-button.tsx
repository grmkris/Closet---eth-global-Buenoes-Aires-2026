"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "../ui/button";

type UploadButtonProps = {
	onFileSelect: (file: File) => void;
	disabled?: boolean;
	loading?: boolean;
	accept?: string;
};

export function UploadButton({
	onFileSelect,
	disabled = false,
	loading = false,
	accept = "image/*",
}: UploadButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClick = () => {
		inputRef.current?.click();
	};

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Client-side validation
			if (!file.type.startsWith("image/")) {
				alert("Please select an image file");
				return;
			}

			// Check file size (max 10MB)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.size > maxSize) {
				alert("File size must be less than 10MB");
				return;
			}

			onFileSelect(file);
			// Reset input to allow re-uploading same file
			event.target.value = "";
		}
	};

	return (
		<>
			<Button
				onClick={handleClick}
				disabled={disabled || loading}
				variant="default"
				size="default"
			>
				<Upload className="mr-2 h-4 w-4" />
				{loading ? "Uploading..." : "Upload Image"}
			</Button>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleChange}
				className="hidden"
				aria-label="Upload clothing image"
			/>
		</>
	);
}
