import { typeIdFromUuid } from "@ai-stilist/shared/typeid";
import { describe, expect, test } from "bun:test";
import {
	generateClothingImageKey,
	getClothingImageKeys,
	parseClothingImageKey,
} from "./storage-keys";

describe("Storage Key Helpers", () => {
	// Use deterministic test IDs for easier debugging
	const testUserId = typeIdFromUuid(
		"user",
		"00000000-0000-0000-0000-000000000001",
	);
	const testItemId = typeIdFromUuid(
		"clothingItem",
		"00000000-0000-0000-0000-000000000002",
	);

	describe("generateClothingImageKey", () => {
		test("generates key for original image", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
				type: "original",
			});

			expect(key).toBe(
				`users/${testUserId}/clothing/originals/${testItemId}`,
			);
		});

		test("generates key with default type (original)", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
			});

			expect(key).toBe(
				`users/${testUserId}/clothing/originals/${testItemId}`,
			);
		});

		test("generates key for small thumbnail", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
				type: "thumbnail_sm",
			});

			expect(key).toBe(
				`users/${testUserId}/clothing/thumbnails/sm/${testItemId}`,
			);
		});

		test("generates key for medium thumbnail", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
				type: "thumbnail_md",
			});

			expect(key).toBe(
				`users/${testUserId}/clothing/thumbnails/md/${testItemId}`,
			);
		});
	});

	describe("parseClothingImageKey", () => {
		test("parses original image key correctly", () => {
			const key = `users/${testUserId}/clothing/originals/${testItemId}`;
			const parsed = parseClothingImageKey(key);

			expect(parsed).toEqual({
				userId: testUserId,
				itemId: testItemId,
				type: "original",
			});
		});

		test("parses small thumbnail key correctly", () => {
			const key = `users/${testUserId}/clothing/thumbnails/sm/${testItemId}`;
			const parsed = parseClothingImageKey(key);

			expect(parsed).not.toBeNull();
			expect(parsed?.userId).toBe(testUserId);
			expect(parsed?.itemId).toBe(testItemId);
			expect(parsed?.type).toBe("thumbnail_sm");
		});

		test("parses medium thumbnail key correctly", () => {
			const key = `users/${testUserId}/clothing/thumbnails/md/${testItemId}`;
			const parsed = parseClothingImageKey(key);

			expect(parsed).not.toBeNull();
			expect(parsed?.userId).toBe(testUserId);
			expect(parsed?.itemId).toBe(testItemId);
			expect(parsed?.type).toBe("thumbnail_md");
		});

		test("returns null for invalid key format", () => {
			const invalidKeys = [
				"invalid/key/format",
				"users/only/two/parts",
				"",
				"no-slashes",
				"users/usr_123/wrong/path/item.jpg",
				"users/usr_123/clothing/originals/item.jpg", // Old format with extension
				"users/usr_123/clothing/thumbnails/item", // Old flat thumbnail path
			];

			for (const key of invalidKeys) {
				const parsed = parseClothingImageKey(key);
				expect(parsed).toBeNull();
			}
		});

		test("returns null for invalid TypeID format", () => {
			const invalidKey =
				"users/not_a_valid_typeid/clothing/originals/itm_123abc";
			const parsed = parseClothingImageKey(invalidKey);

			expect(parsed).toBeNull();
		});

		test("round-trip: generate then parse", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
				type: "original",
			});
			const parsed = parseClothingImageKey(key);

			expect(parsed).not.toBeNull();
			expect(parsed?.userId).toBe(testUserId);
			expect(parsed?.itemId).toBe(testItemId);
			expect(parsed?.type).toBe("original");
		});

		test("round-trip: thumbnail variant", () => {
			const key = generateClothingImageKey({
				userId: testUserId,
				itemId: testItemId,
				type: "thumbnail_sm",
			});
			const parsed = parseClothingImageKey(key);

			expect(parsed).not.toBeNull();
			expect(parsed?.userId).toBe(testUserId);
			expect(parsed?.itemId).toBe(testItemId);
			expect(parsed?.type).toBe("thumbnail_sm");
		});
	});

	describe("getClothingImageKeys", () => {
		test("returns all storage keys for an item", () => {
			const keys = getClothingImageKeys({
				userId: testUserId,
				itemId: testItemId,
			});

			expect(keys.original).toBe(
				`users/${testUserId}/clothing/originals/${testItemId}`,
			);
			expect(keys.thumbnails.sm).toBe(
				`users/${testUserId}/clothing/thumbnails/sm/${testItemId}`,
			);
			expect(keys.thumbnails.md).toBe(
				`users/${testUserId}/clothing/thumbnails/md/${testItemId}`,
			);
		});

		test("all returned keys can be parsed back", () => {
			const keys = getClothingImageKeys({
				userId: testUserId,
				itemId: testItemId,
			});

			const parsedOriginal = parseClothingImageKey(keys.original);
			const parsedSmall = parseClothingImageKey(keys.thumbnails.sm);
			const parsedMedium = parseClothingImageKey(keys.thumbnails.md);

			expect(parsedOriginal?.type).toBe("original");
			expect(parsedSmall?.type).toBe("thumbnail_sm");
			expect(parsedMedium?.type).toBe("thumbnail_md");

			// All should have the same userId and itemId
			for (const parsed of [parsedOriginal, parsedSmall, parsedMedium]) {
				expect(parsed?.userId).toBe(testUserId);
				expect(parsed?.itemId).toBe(testItemId);
			}
		});
	});
});
