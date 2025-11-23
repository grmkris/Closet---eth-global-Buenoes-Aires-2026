"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadFabProps = {
	onClick: () => void;
	className?: string;
};

export function UploadFab({ onClick, className }: UploadFabProps) {
	return (
		<Button
			className={cn(
				"fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-6",
				className
			)}
			onClick={onClick}
			size="icon"
			type="button"
		>
			<Camera className="h-6 w-6" />
			<span className="sr-only">Upload photos</span>
		</Button>
	);
}
