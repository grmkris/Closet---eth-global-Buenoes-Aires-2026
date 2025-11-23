import { and, eq } from "@ai-stilist/db/drizzle";
import { agentsTable } from "@ai-stilist/db/schema/agents";
import { AgentId, UserId } from "@ai-stilist/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

// Input schemas
const CreateAgentInput = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	specialty: z.enum([
		"minimalist",
		"vintage",
		"streetwear",
		"luxury",
		"sustainable",
	]),
	priceMonthly: z.number().positive(),
});

const ListAgentsInput = z
	.object({
		specialty: z.string().optional(),
		verified: z.boolean().optional(),
	})
	.optional();

const GetAgentInput = z.object({
	id: AgentId,
});

export const agentRouter = {
	/**
	 * Create a new AI stylist agent with CDP wallet
	 */
	create: protectedProcedure
		.input(CreateAgentInput)
		.handler(async ({ input, context }) => {
			const userId = UserId.parse(context.session.user.id);

			// Create CDP wallet on Base network
			const wallet = await context.walletClient.createWallet({
				networkId: "base-mainnet",
			});

			const address = await wallet.getDefaultAddress();

			// Create agent in DB
			const [agent] = await context.db
				.insert(agentsTable)
				.values({
					name: input.name,
					description: input.description,
					specialty: input.specialty,
					priceMonthly: Math.round(input.priceMonthly * 100),
					walletAddress: address.getId(),
					creatorUserId: userId,
					active: true,
				})
				.returning();

			if (!agent) {
				throw new Error("Failed to create agent");
			}

			context.logger.info({
				msg: "Agent created",
				agentId: agent.id,
				creatorUserId: userId,
				specialty: agent.specialty,
			});

			return {
				id: agent.id,
				name: agent.name,
				specialty: agent.specialty,
				walletAddress: agent.walletAddress,
			};
		}),

	/**
	 * List active AI stylist agents with optional filtering
	 */
	list: publicProcedure
		.input(ListAgentsInput)
		.handler(async ({ input, context }) => {
			const conditions = [eq(agentsTable.active, true)];

			if (input?.specialty) {
				conditions.push(eq(agentsTable.specialty, input.specialty));
			}
			if (input?.verified !== undefined) {
				conditions.push(eq(agentsTable.verified, input.verified));
			}

			const agents = await context.db.query.agentsTable.findMany({
				where: and(...conditions),
				orderBy: (a, { desc: descFn }) => [
					descFn(a.reputationScore),
					descFn(a.createdAt),
				],
				columns: {
					id: true,
					name: true,
					description: true,
					specialty: true,
					walletAddress: true,
					reputationScore: true,
					priceMonthly: true,
					verified: true,
					createdAt: true,
				},
			});

			return {
				agents,
				total: agents.length,
			};
		}),

	/**
	 * Get a single agent by ID
	 */
	get: publicProcedure
		.input(GetAgentInput)
		.handler(async ({ input, context }) => {
			const agent = await context.db.query.agentsTable.findFirst({
				where: eq(agentsTable.id, input.id),
			});

			if (!agent) {
				throw new Error("Agent not found");
			}

			return agent;
		}),
};
