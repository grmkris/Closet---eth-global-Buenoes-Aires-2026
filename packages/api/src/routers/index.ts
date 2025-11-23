import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { agentRouter } from "./agent.router";
import { aiRouter } from "./ai.router";
import { spendingRouter } from "./spending.router";
import { subscriptionRouter } from "./subscription.router";
import { wardrobeRouter } from "./wardrobe.router";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
	wardrobe: wardrobeRouter,
	ai: aiRouter,
	agent: agentRouter,
	subscription: subscriptionRouter,
	spending: spendingRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
