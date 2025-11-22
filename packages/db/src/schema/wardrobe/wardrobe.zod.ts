import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { clothingAnalysis, clothingItem } from "./clothing.db";

// Clothing Item Schemas
export const insertClothingItemSchema = createInsertSchema(clothingItem);
export const selectClothingItemSchema = createSelectSchema(clothingItem);
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;
export type SelectClothingItem = z.infer<typeof selectClothingItemSchema>;

// Clothing Analysis Schemas
export const insertClothingAnalysisSchema =
	createInsertSchema(clothingAnalysis);
export const selectClothingAnalysisSchema =
	createSelectSchema(clothingAnalysis);
export type InsertClothingAnalysis = z.infer<
	typeof insertClothingAnalysisSchema
>;
export type SelectClothingAnalysis = z.infer<
	typeof selectClothingAnalysisSchema
>;
