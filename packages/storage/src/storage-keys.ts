import type { ClothingItemId, UserId } from "@ai-stilist/shared/typeid";
import { validateTypeId } from "@ai-stilist/shared/typeid";

export type ClothingImageType = "original" | "thumbnail_sm" | "thumbnail_md";

const clothingImageKeyPattern =
	/^users\/([^/]+)\/clothing\/(originals|thumbnails\/(sm|md))\/([^/]+)$/;

/**
 * Generate S3 key for clothing image (no file extension)
 * Format: users/{userId}/clothing/{folder}/{itemId}
 *
 * @example
 * generateClothingImageKey({ userId, itemId, type: "original" })
 * // => "users/usr_abc123/clothing/originals/itm_xyz789"
 *
 * generateClothingImageKey({ userId, itemId, type: "thumbnail_sm" })
 * // => "users/usr_abc123/clothing/thumbnails/sm/itm_xyz789"
 */
export function generateClothingImageKey(params: {
	userId: UserId;
	itemId: ClothingItemId;
	type?: ClothingImageType;
}): string {
	const { userId, itemId, type = "original" } = params;

	const subfolder =
		type === "original"
			? "originals"
			: `thumbnails/${type.replace("thumbnail_", "")}`;

	return `users/${userId}/clothing/${subfolder}/${itemId}`;
}

/**
 * Parse clothing image key to extract userId, itemId, and type
 * Returns null if key format is invalid or IDs don't validate as TypeIDs
 *
 * @example
 * parseClothingImageKey("users/usr_abc123/clothing/originals/itm_xyz789")
 * // => { userId: "usr_abc123", itemId: "itm_xyz789", type: "original" }
 */
export function parseClothingImageKey(key: string): {
	userId: UserId;
	itemId: ClothingItemId;
	type: ClothingImageType;
} | null {
	const match = key.match(clothingImageKeyPattern);

	if (!match) {
		return null;
	}

	const [, userId, folder, thumbSize, itemId] = match;

	// Validate that extracted IDs are valid TypeIDs
	if (!validateTypeId("user", userId)) {
		return null;
	}
	if (!validateTypeId("clothingItem", itemId)) {
		return null;
	}

	const type: ClothingImageType =
		folder === "originals"
			? "original"
			: (`thumbnail_${thumbSize}` as ClothingImageType);

	return {
		userId: userId as UserId,
		itemId: itemId as ClothingItemId,
		type,
	};
}

/**
 * Get all storage keys for a clothing item (original + all thumbnails)
 * Useful for batch operations like deletion or checking existence
 *
 * @example
 * const keys = getClothingImageKeys({ userId, itemId });
 * // => {
 * //   original: "users/usr_abc123/clothing/originals/itm_xyz789",
 * //   thumbnails: {
 * //     sm: "users/usr_abc123/clothing/thumbnails/sm/itm_xyz789",
 * //     md: "users/usr_abc123/clothing/thumbnails/md/itm_xyz789"
 * //   }
 * // }
 */
export function getClothingImageKeys(params: {
	userId: UserId;
	itemId: ClothingItemId;
}): {
	original: string;
	thumbnails: {
		sm: string;
		md: string;
	};
} {
	const { userId, itemId } = params;
	return {
		original: generateClothingImageKey({ userId, itemId, type: "original" }),
		thumbnails: {
			sm: generateClothingImageKey({ userId, itemId, type: "thumbnail_sm" }),
			md: generateClothingImageKey({ userId, itemId, type: "thumbnail_md" }),
		},
	};
}
