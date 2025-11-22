import type { Database } from "@ai-stilist/db";
import { stylingRule, type SelectStylingRule } from "@ai-stilist/db/schema/wardrobe";
import { desc, eq } from "drizzle-orm";

export type StylingRulesService = ReturnType<typeof createStylingRulesService>;

export function createStylingRulesService(db: Database) {
	/**
	 * Get all active styling rules, ordered by priority
	 */
	async function getActiveRules(): Promise<SelectStylingRule[]> {
		return db
			.select()
			.from(stylingRule)
			.where(eq(stylingRule.active, true))
			.orderBy(desc(stylingRule.priority));
	}

	/**
	 * Get rules by type
	 */
	async function getRulesByType(
		ruleType: SelectStylingRule["ruleType"]
	): Promise<SelectStylingRule[]> {
		return db
			.select()
			.from(stylingRule)
			.where(eq(stylingRule.ruleType, ruleType))
			.where(eq(stylingRule.active, true))
			.orderBy(desc(stylingRule.priority));
	}

	return {
		getActiveRules,
		getRulesByType,
	};
}
