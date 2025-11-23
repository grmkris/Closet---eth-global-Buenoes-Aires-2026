import type { Logger } from "@ai-stilist/logger";
import type { Database } from "../db";
import { agentsTable } from "../schema/agents";

/**
 * Ensures a default agent exists in the database.
 * Called on server startup to initialize the system agent.
 */
export async function seedDefaultAgent(props: {
	db: Database;
	logger: Logger;
	walletAddress: string;
}): Promise<void> {
	const { db, logger, walletAddress } = props;

	logger.info({
		msg: "Seeding default agent",
		walletAddress,
	});

	const DEFAULT_AGENT = {
		name: "AI Stylist",
		description:
			"Your personal AI fashion assistant. Get personalized style advice, outfit recommendations, and wardrobe management.",
		specialty: "general",
		walletAddress,
		priceMonthly: 0.001, // $0.001/month in cents
		verified: true,
		active: true,
		creatorUserId: null, // System agent
	};

	// No agents exist, create the default one
	await db.insert(agentsTable).values(DEFAULT_AGENT).onConflictDoNothing();
	logger.info({
		msg: "Default agent created",
		walletAddress,
	});
}
