import type { Database } from "../db";
import { agentsTable } from "../schema/agents";

/**
 * Ensures a default agent exists in the database.
 * Called on server startup to initialize the system agent.
 */
export async function seedDefaultAgent(db: Database): Promise<void> {
	// Check if any agents exist
	const existingAgents = await db.select().from(agentsTable).limit(1);

	if (existingAgents.length === 0) {
		// Get wallet address from environment or use placeholder
		const walletAddress =
			process.env.DEFAULT_AGENT_WALLET_ADDRESS ||
			"0x0000000000000000000000000000000000000000";

		const DEFAULT_AGENT = {
			name: "AI Stylist",
			description:
				"Your personal AI fashion assistant. Get personalized style advice, outfit recommendations, and wardrobe management.",
			specialty: "general",
			walletAddress,
			priceMonthly: 999, // $9.99/month in cents
			verified: true,
			active: true,
			creatorUserId: null, // System agent
		};

		// No agents exist, create the default one
		await db.insert(agentsTable).values(DEFAULT_AGENT);
		console.log(`✓ Default agent created with wallet: ${walletAddress}`);
	}
}
