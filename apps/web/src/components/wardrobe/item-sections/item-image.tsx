import Image from "next/image";

type ItemImageProps = {
	imageUrl: string;
	processedImageUrl?: string | null;
	alt: string;
};

export function ItemImage({
	imageUrl,
	processedImageUrl,
	alt,
}: ItemImageProps) {
	// Use processed image if available, otherwise fall back to original
	const displayUrl = processedImageUrl || imageUrl;

	return (
		<div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
			<Image
				alt={alt}
				className="object-cover"
				fill
				priority
				sizes="(max-width: 768px) 100vw, 50vw"
				src={displayUrl}
			/>
		</div>
	);
}
