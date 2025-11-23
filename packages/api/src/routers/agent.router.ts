import { and, eq } from "@ai-stilist/db/drizzle";
import { agentsTable } from "@ai-stilist/db/schema/agents";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../context";

export const agentRouter = router({
	create: protectedProcedure
		.input(
			z.object({
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
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Create CDP wallet using factory
			const { createWalletClient } = await import("@ai-stilist/cdp-wallet");
			const walletClient = createWalletClient({
				apiKeyFile: process.env.CDP_API_KEY_FILE!,
				logger: ctx.logger,
			});

			const wallet = await walletClient.createWallet({
				networkId: "base-mainnet",
			});

			const address = await wallet.getDefaultAddress();

			// Create agent in DB
			const [agent] = await ctx.db
				.insert(agentsTable)
				.values({
					name: input.name,
					description: input.description,
					specialty: input.specialty,
					priceMonthly: Math.round(input.priceMonthly * 100),
					walletAddress: address.getId(),
					creatorUserId: ctx.session.user.id,
					active: true,
				})
				.returning();

			return {
				id: agent.id,
				name: agent.name,
				walletAddress: agent.walletAddress,
			};
		}),

	list: publicProcedure
		.input(
			z
				.object({
					specialty: z.string().optional(),
					verified: z.boolean().optional(),
				})
				.optional()
		)
		.query(async ({ input, ctx }) => {
			const conditions = [eq(agentsTable.active, true)];

			if (input?.specialty) {
				conditions.push(eq(agentsTable.specialty, input.specialty));
			}
			if (input?.verified !== undefined) {
				conditions.push(eq(agentsTable.verified, input.verified));
			}

			return await ctx.db.query.agentsTable.findMany({
				where: and(...conditions),
				columns: {
					id: true,
					name: true,
					description: true,
					specialty: true,
					walletAddress: true,
					reputationScore: true,
					priceMonthly: true,
					verified: true,
				},
			});
		}),

	get: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			return await ctx.db.query.agentsTable.findFirst({
				where: eq(agentsTable.id, input.id),
			});
		}),
});
