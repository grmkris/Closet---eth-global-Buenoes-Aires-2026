import type { Database, Transaction } from "@ai-stilist/db";
import { and, eq, inArray, sql } from "@ai-stilist/db/drizzle";
import {
	categoriesTable,
	clothingItemCategoriesTable,
	clothingItemColorsTable,
	clothingItemsTable,
	clothingItemTagsTable,
	colorsTable,
	type TagSource,
	tagsTable,
	tagTypesTable,
} from "@ai-stilist/db/schema/wardrobe";
import type {
	CategoryId,
	ClothingItemId,
	ColorId,
	TagId,
	TagTypeId,
	UserId,
} from "@ai-stilist/shared/typeid";
import { typeIdGenerator } from "@ai-stilist/shared/typeid";

// Type for transaction context
type DbOrTx = Database | Transaction;

// ============================================================================
// CORE INSERTION FUNCTIONS (Used by AI Worker)
// ============================================================================

/**
 * Insert or find a category and link it to a clothing item
 * Creates the category if it doesn't exist (case-insensitive match)
 */
export async function insertClothingCategory(
	tx: DbOrTx,
	itemId: ClothingItemId,
	categoryName: string
): Promise<void> {
	const normalized = categoryName.trim().toLowerCase();
	const displayName = categoryName.trim();

	// Upsert category (handles race conditions)
	const [category] = await tx
		.insert(categoriesTable)
		.values({
			id: typeIdGenerator("category"),
			name: normalized,
			displayName,
		})
		.onConflictDoUpdate({
			target: [categoriesTable.name],
			set: { updatedAt: sql`CURRENT_TIMESTAMP` },
		})
		.returning();

	if (!category) {
		throw new Error(`Failed to insert/find category: ${categoryName}`);
	}

	// Link to item (ignore if already exists)
	await tx
		.insert(clothingItemCategoriesTable)
		.values({
			itemId,
			categoryId: category.id,
		})
		.onConflictDoNothing();
}

/**
 * Insert or find colors and link them to a clothing item
 * Creates colors if they don't exist (case-insensitive match)
 * Maintains order for color prominence
 */
export async function insertClothingColors(
	tx: DbOrTx,
	itemId: ClothingItemId,
	colors: string[]
): Promise<void> {
	for (const [index, colorInput] of colors.entries()) {
		const colorName = colorInput.trim().toLowerCase();

		// Upsert color (handles race conditions)
		const [color] = await tx
			.insert(colorsTable)
			.values({
				id: typeIdGenerator("color"),
				name: colorName,
				hexCode: null,
			})
			.onConflictDoUpdate({
				target: [colorsTable.name],
				set: { updatedAt: sql`CURRENT_TIMESTAMP` },
			})
			.returning();

		if (!color) {
			throw new Error(`Failed to insert/find color: ${colorName}`);
		}

		// Link to item with order (ignore if already exists)
		await tx
			.insert(clothingItemColorsTable)
			.values({
				itemId,
				colorId: color.id,
				order: index, // First color is most prominent
			})
			.onConflictDoNothing();
	}
}

/**
 * Insert or find tags and link them to a clothing item
 * Creates tag types and tags if they don't exist
 * Increments usage count for existing tags
 * Tags are provided by AI with type and name already specified
 */
export async function insertClothingTags(
	tx: DbOrTx,
	itemId: ClothingItemId,
	tags: Array<{ type: string; name: string }>,
	source: TagSource
): Promise<void> {
	for (const tagInput of tags) {
		const typeName = tagInput.type.trim().toLowerCase();
		const tagName = tagInput.name.trim().toLowerCase();

		// Upsert tag type (handles race conditions)
		const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
		const [tagType] = await tx
			.insert(tagTypesTable)
			.values({
				id: typeIdGenerator("tagType"),
				name: typeName,
				displayName,
			})
			.onConflictDoUpdate({
				target: [tagTypesTable.name],
				set: { updatedAt: sql`CURRENT_TIMESTAMP` },
			})
			.returning();

		if (!tagType) {
			throw new Error(`Failed to insert/find tag type: ${typeName}`);
		}

		// Upsert tag (handles race conditions)
		// Using onConflictDoUpdate to increment usage count
		const [tag] = await tx
			.insert(tagsTable)
			.values({
				id: typeIdGenerator("tag"),
				typeId: tagType.id,
				name: tagName,
				usageCount: 1,
			})
			.onConflictDoUpdate({
				target: [tagsTable.typeId, tagsTable.name],
				set: {
					usageCount: sql`${tagsTable.usageCount} + 1`,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				},
			})
			.returning();

		if (!tag) {
			throw new Error(`Failed to insert/find tag: ${tagName}`);
		}

		// Link to item (ignore if already exists)
		await tx
			.insert(clothingItemTagsTable)
			.values({
				itemId,
				tagId: tag.id,
				source,
			})
			.onConflictDoNothing();
	}
}

/**
 * Get all existing tags for a user (for AI consistency)
 * Returns unique tag names across all items
 */
export async function getExistingTags(
	db: Database,
	userId: UserId
): Promise<string[]> {
	const results = await db
		.selectDistinct({ tagName: tagsTable.name })
		.from(tagsTable)
		.innerJoin(
			clothingItemTagsTable,
			eq(tagsTable.id, clothingItemTagsTable.tagId)
		)
		.innerJoin(
			clothingItemsTable,
			eq(clothingItemsTable.id, clothingItemTagsTable.itemId)
		)
		.where(eq(clothingItemsTable.userId, userId));

	return results.map((r) => r.tagName);
}

// ============================================================================
// USER CRUD OPERATIONS (For API endpoints)
// ============================================================================

// --- TAG MANAGEMENT ---

export type TagWithType = {
	id: TagId;
	name: string;
	type: {
		id: TagTypeId;
		name: string;
		displayName: string;
	};
	usageCount: number;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Get all tags, optionally filtered by user
 */
export async function getAllTags(
	db: Database,
	userId?: UserId
): Promise<TagWithType[]> {
	if (userId) {
		return await db
			.select({
				id: tagsTable.id,
				name: tagsTable.name,
				usageCount: tagsTable.usageCount,
				createdAt: tagsTable.createdAt,
				updatedAt: tagsTable.updatedAt,
				type: {
					id: tagTypesTable.id,
					name: tagTypesTable.name,
					displayName: tagTypesTable.displayName,
				},
			})
			.from(tagsTable)
			.innerJoin(tagTypesTable, eq(tagsTable.typeId, tagTypesTable.id))
			.innerJoin(
				clothingItemTagsTable,
				eq(tagsTable.id, clothingItemTagsTable.tagId)
			)
			.innerJoin(
				clothingItemsTable,
				eq(clothingItemsTable.id, clothingItemTagsTable.itemId)
			)
			.where(eq(clothingItemsTable.userId, userId));
	}

	return await db
		.select({
			id: tagsTable.id,
			name: tagsTable.name,
			usageCount: tagsTable.usageCount,
			createdAt: tagsTable.createdAt,
			updatedAt: tagsTable.updatedAt,
			type: {
				id: tagTypesTable.id,
				name: tagTypesTable.name,
				displayName: tagTypesTable.displayName,
			},
		})
		.from(tagsTable)
		.innerJoin(tagTypesTable, eq(tagsTable.typeId, tagTypesTable.id));
}

/**
 * Create a new tag
 */
export async function createTag(
	db: Database,
	input: { name: string; typeId: TagTypeId }
): Promise<TagWithType> {
	const normalized = input.name.trim().toLowerCase();

	// Check if already exists
	const existing = await db.query.tagsTable.findFirst({
		where: and(
			eq(tagsTable.typeId, input.typeId),
			eq(sql`LOWER(${tagsTable.name})`, normalized)
		),
		with: { type: true },
	});

	if (existing) {
		throw new Error(
			`Tag "${input.name}" already exists in type "${existing.type.name}"`
		);
	}

	const [tag] = await db
		.insert(tagsTable)
		.values({
			id: typeIdGenerator("tag"),
			typeId: input.typeId,
			name: normalized,
			usageCount: 0,
		})
		.returning();

	if (!tag) {
		throw new Error("Failed to create tag");
	}

	const type = await db.query.tagTypesTable.findFirst({
		where: eq(tagTypesTable.id, input.typeId),
	});

	if (!type) {
		throw new Error("Tag type not found");
	}

	return {
		id: tag.id,
		name: tag.name,
		usageCount: tag.usageCount,
		createdAt: tag.createdAt,
		updatedAt: tag.updatedAt,
		type: {
			id: type.id,
			name: type.name,
			displayName: type.displayName,
		},
	};
}

/**
 * Update tag name
 */
export async function updateTag(
	db: Database,
	tagId: TagId,
	updates: { name?: string }
): Promise<void> {
	const normalized = updates.name
		? updates.name.trim().toLowerCase()
		: undefined;

	if (normalized) {
		await db
			.update(tagsTable)
			.set({ name: normalized })
			.where(eq(tagsTable.id, tagId));
	}
}

/**
 * Delete a tag (only if not in use)
 */
export async function deleteTag(db: Database, tagId: TagId): Promise<void> {
	// Check if in use
	const usage = await db.query.clothingItemTagsTable.findFirst({
		where: eq(clothingItemTagsTable.tagId, tagId),
	});

	if (usage) {
		throw new Error("Cannot delete tag that is in use");
	}

	await db.delete(tagsTable).where(eq(tagsTable.id, tagId));
}

/**
 * Merge multiple tags into a target tag
 * Reassigns all clothing items and deletes source tags
 */
export async function mergeTags(
	db: Database,
	sourceTagIds: TagId[],
	targetTagId: TagId
): Promise<void> {
	await db.transaction(async (tx) => {
		// Update all references to source tags to point to target tag
		await tx
			.update(clothingItemTagsTable)
			.set({ tagId: targetTagId })
			.where(inArray(clothingItemTagsTable.tagId, sourceTagIds));

		// Recalculate usage count for target tag
		const usageCount = await tx
			.select({ count: sql<number>`count(*)` })
			.from(clothingItemTagsTable)
			.where(eq(clothingItemTagsTable.tagId, targetTagId));

		const count = usageCount[0]?.count ?? 0;

		await tx
			.update(tagsTable)
			.set({ usageCount: count })
			.where(eq(tagsTable.id, targetTagId));

		// Delete source tags
		await tx.delete(tagsTable).where(inArray(tagsTable.id, sourceTagIds));
	});
}

// --- CATEGORY MANAGEMENT ---

export type Category = {
	id: CategoryId;
	name: string;
	displayName: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Get all categories
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
	return await db.select().from(categoriesTable);
}

/**
 * Create a new category
 */
export async function createCategory(
	db: Database,
	input: { name: string; displayName?: string }
): Promise<Category> {
	const normalized = input.name.trim().toLowerCase();
	const displayName = input.displayName?.trim() || normalized;

	// Check if already exists
	const existing = await db.query.categoriesTable.findFirst({
		where: eq(sql`LOWER(${categoriesTable.name})`, normalized),
	});

	if (existing) {
		throw new Error(`Category "${input.name}" already exists`);
	}

	const [category] = await db
		.insert(categoriesTable)
		.values({
			id: typeIdGenerator("category"),
			name: normalized,
			displayName,
		})
		.returning();

	if (!category) {
		throw new Error("Failed to create category");
	}

	return category;
}

/**
 * Update category
 */
export async function updateCategory(
	db: Database,
	categoryId: CategoryId,
	updates: { name?: string; displayName?: string }
): Promise<void> {
	const data: { name?: string; displayName?: string } = {};

	if (updates.name) {
		data.name = updates.name.trim().toLowerCase();
	}
	if (updates.displayName) {
		data.displayName = updates.displayName.trim();
	}

	if (Object.keys(data).length > 0) {
		await db
			.update(categoriesTable)
			.set(data)
			.where(eq(categoriesTable.id, categoryId));
	}
}

/**
 * Delete a category (only if not in use)
 */
export async function deleteCategory(
	db: Database,
	categoryId: CategoryId
): Promise<void> {
	// Check if in use
	const usage = await db.query.clothingItemCategoriesTable.findFirst({
		where: eq(clothingItemCategoriesTable.categoryId, categoryId),
	});

	if (usage) {
		throw new Error("Cannot delete category that is in use");
	}

	await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
}

// --- COLOR MANAGEMENT ---

export type Color = {
	id: ColorId;
	name: string;
	hexCode: string | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Get all colors
 */
export async function getAllColors(db: Database): Promise<Color[]> {
	return await db.select().from(colorsTable);
}

/**
 * Create a new color
 */
export async function createColor(
	db: Database,
	input: { name: string; hexCode?: string }
): Promise<Color> {
	const normalized = input.name.trim().toLowerCase();

	// Check if already exists
	const existing = await db.query.colorsTable.findFirst({
		where: eq(sql`LOWER(${colorsTable.name})`, normalized),
	});

	if (existing) {
		throw new Error(`Color "${input.name}" already exists`);
	}

	const [color] = await db
		.insert(colorsTable)
		.values({
			id: typeIdGenerator("color"),
			name: normalized,
			hexCode: input.hexCode?.trim() || null,
		})
		.returning();

	if (!color) {
		throw new Error("Failed to create color");
	}

	return color;
}

/**
 * Update color
 */
export async function updateColor(
	db: Database,
	colorId: ColorId,
	updates: { name?: string; hexCode?: string }
): Promise<void> {
	const data: { name?: string; hexCode?: string | null } = {};

	if (updates.name) {
		data.name = updates.name.trim().toLowerCase();
	}
	if (updates.hexCode !== undefined) {
		data.hexCode = updates.hexCode.trim() || null;
	}

	if (Object.keys(data).length > 0) {
		await db.update(colorsTable).set(data).where(eq(colorsTable.id, colorId));
	}
}

/**
 * Delete a color (only if not in use)
 */
export async function deleteColor(
	db: Database,
	colorId: ColorId
): Promise<void> {
	// Check if in use
	const usage = await db.query.clothingItemColorsTable.findFirst({
		where: eq(clothingItemColorsTable.colorId, colorId),
	});

	if (usage) {
		throw new Error("Cannot delete color that is in use");
	}

	await db.delete(colorsTable).where(eq(colorsTable.id, colorId));
}

/**
 * Merge multiple colors into a target color
 * Reassigns all clothing items and deletes source colors
 */
export async function mergeColors(
	db: Database,
	sourceColorIds: ColorId[],
	targetColorId: ColorId
): Promise<void> {
	await db.transaction(async (tx) => {
		// Update all references to source colors to point to target color
		await tx
			.update(clothingItemColorsTable)
			.set({ colorId: targetColorId })
			.where(inArray(clothingItemColorsTable.colorId, sourceColorIds));

		// Delete source colors
		await tx.delete(colorsTable).where(inArray(colorsTable.id, sourceColorIds));
	});
}

// --- TAG TYPE MANAGEMENT ---

export type TagType = {
	id: TagTypeId;
	name: string;
	displayName: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Get all tag types
 */
export async function getAllTagTypes(db: Database): Promise<TagType[]> {
	return await db.select().from(tagTypesTable);
}

/**
 * Create a new tag type
 */
export async function createTagType(
	db: Database,
	input: { name: string; displayName?: string }
): Promise<TagType> {
	const normalized = input.name.trim().toLowerCase();
	const displayName =
		input.displayName?.trim() ||
		normalized.charAt(0).toUpperCase() + normalized.slice(1);

	// Check if already exists
	const existing = await db.query.tagTypesTable.findFirst({
		where: eq(sql`LOWER(${tagTypesTable.name})`, normalized),
	});

	if (existing) {
		throw new Error(`Tag type "${input.name}" already exists`);
	}

	const [tagType] = await db
		.insert(tagTypesTable)
		.values({
			id: typeIdGenerator("tagType"),
			name: normalized,
			displayName,
		})
		.returning();

	if (!tagType) {
		throw new Error("Failed to create tag type");
	}

	return tagType;
}

/**
 * Update tag type
 */
export async function updateTagType(
	db: Database,
	tagTypeId: TagTypeId,
	updates: { name?: string; displayName?: string }
): Promise<void> {
	const data: { name?: string; displayName?: string } = {};

	if (updates.name) {
		data.name = updates.name.trim().toLowerCase();
	}
	if (updates.displayName) {
		data.displayName = updates.displayName.trim();
	}

	if (Object.keys(data).length > 0) {
		await db
			.update(tagTypesTable)
			.set(data)
			.where(eq(tagTypesTable.id, tagTypeId));
	}
}

/**
 * Delete a tag type (only if no tags use it)
 */
export async function deleteTagType(
	db: Database,
	tagTypeId: TagTypeId
): Promise<void> {
	// Check if any tags use this type
	const usage = await db.query.tagsTable.findFirst({
		where: eq(tagsTable.typeId, tagTypeId),
	});

	if (usage) {
		throw new Error("Cannot delete tag type that has tags");
	}

	await db.delete(tagTypesTable).where(eq(tagTypesTable.id, tagTypeId));
}
