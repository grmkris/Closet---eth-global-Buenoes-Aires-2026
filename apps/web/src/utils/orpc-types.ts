import type { client } from "./orpc";

/**
 * Helper type to extract success response from oRPC union types
 * Excludes ORPCError types which have { code: string; message: string }
 */
type ExtractSuccess<T> = Exclude<T, { code: string; message: string }>;

// ===== Wardrobe Response Types =====

/**
 * Paginated wardrobe items list response
 */
export type WardrobeItemsResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.getItems>>
>;

/**
 * Single clothing item from the paginated list
 */
export type WardrobeItem = WardrobeItemsResponse["items"][0];

/**
 * Full clothing item details with all relations
 */
export type WardrobeItemDetails = NonNullable<
	ExtractSuccess<Awaited<ReturnType<typeof client.wardrobe.getItem>>>
>;

/**
 * Upload single image response
 */
export type UploadResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.upload>>
>;

/**
 * Batch upload response
 */
export type BatchUploadResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.batchUpload>>
>;

/**
 * Single upload item from batch upload
 */
export type BatchUploadItem = BatchUploadResponse["items"][0];

/**
 * User tags response (tags in user's wardrobe with counts)
 */
export type UserTagsResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.getTags>>
>;

/**
 * Single tag with count from user's wardrobe
 */
export type UserTag = UserTagsResponse["tags"][0];

/**
 * Delete item response
 */
export type DeleteItemResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.deleteItem>>
>;

// ===== Wardrobe List Response Types (Read-Only) =====

/**
 * All tags list response
 */
export type TagsListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.listTags>>
>;

/**
 * Single tag from tags list
 */
export type Tag = TagsListResponse["tags"][0];

/**
 * All categories list response
 */
export type CategoriesListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.listCategories>>
>;

/**
 * Single category from categories list
 */
export type Category = CategoriesListResponse["categories"][0];

/**
 * All colors list response
 */
export type ColorsListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.listColors>>
>;

/**
 * Single color from colors list
 */
export type Color = ColorsListResponse["colors"][0];

/**
 * All tag types list response
 */
export type TagTypesListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.wardrobe.listTagTypes>>
>;

/**
 * Single tag type from tag types list
 */
export type TagType = TagTypesListResponse["tagTypes"][0];

// ===== Wardrobe Nested Types =====

/**
 * Clothing category relation (category with junction table data)
 */
export type ClothingCategory = WardrobeItemDetails["categories"][0];

/**
 * Clothing color relation (color with order)
 */
export type ClothingColor = WardrobeItemDetails["colors"][0];

/**
 * Clothing tag relation (tag with type and source)
 */
export type ClothingTag = WardrobeItemDetails["tags"][0];

/**
 * Clothing analysis data
 */
export type ClothingAnalysis = NonNullable<WardrobeItemDetails["analysis"]>;

// ===== Wardrobe Input Types =====

/**
 * Get items input parameters
 */
export type GetItemsInput = Parameters<typeof client.wardrobe.getItems>[0];

/**
 * Get single item input parameters
 */
export type GetItemInput = Parameters<typeof client.wardrobe.getItem>[0];

/**
 * Upload single image input parameters
 */
export type UploadInput = Parameters<typeof client.wardrobe.upload>[0];

/**
 * Batch upload input parameters
 */
export type BatchUploadInput = Parameters<
	typeof client.wardrobe.batchUpload
>[0];

/**
 * Delete item input parameters
 */
export type DeleteItemInput = Parameters<typeof client.wardrobe.deleteItem>[0];

// ===== Agent Response Types =====

/**
 * Agents list response
 */
export type AgentsListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.agent.list>>
>;

/**
 * Single agent from agents list
 */
export type Agent = AgentsListResponse["agents"][0];

/**
 * Single agent details
 */
export type AgentDetails = ExtractSuccess<
	Awaited<ReturnType<typeof client.agent.get>>
>;

// ===== Agent Input Types =====

/**
 * List agents input parameters
 */
export type ListAgentsInput = Parameters<typeof client.agent.list>[0];

/**
 * Get agent input parameters
 */
export type GetAgentInput = Parameters<typeof client.agent.get>[0];

/**
 * Create agent input parameters
 */
export type CreateAgentInput = Parameters<typeof client.agent.create>[0];

// ===== Subscription Response Types =====

/**
 * Subscriptions list response
 */
export type SubscriptionsListResponse = ExtractSuccess<
	Awaited<ReturnType<typeof client.subscription.list>>
>;

/**
 * Single subscription from list
 */
export type Subscription = SubscriptionsListResponse["subscriptions"][0];

/**
 * Single subscription details
 */
export type SubscriptionDetails = ExtractSuccess<
	Awaited<ReturnType<typeof client.subscription.get>>
>;

/**
 * Cancel subscription input parameters
 */
export type CancelSubscriptionInput = Parameters<
	typeof client.subscription.cancel
>[0];

/**
 * Payment requirements for subscription
 */
export type PaymentRequirements = ExtractSuccess<
	Awaited<ReturnType<typeof client.subscription.initiate>>
>;

/**
 * Complete subscription input parameters
 */
export type CompleteSubscriptionInput = Parameters<
	typeof client.subscription.complete
>[0];
