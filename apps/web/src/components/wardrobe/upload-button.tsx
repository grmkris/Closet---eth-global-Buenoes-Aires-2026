"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { MAX_FILE_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";
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
				toast.error("Please select an image file");
				return;
			}

			// Check file size
			if (file.size > MAX_UPLOAD_SIZE_BYTES) {
				toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
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
				disabled={disabled || loading}
				onClick={handleClick}
				size="default"
				variant="default"
			>
				<Upload className="mr-2 h-4 w-4" />
				{loading ? "Uploading..." : "Upload Image"}
			</Button>
			<input
				accept={accept}
				aria-label="Upload clothing image"
				className="hidden"
				onChange={handleChange}
				ref={inputRef}
				type="file"
			/>
		</>
	);
}
