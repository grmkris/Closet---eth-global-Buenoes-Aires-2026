import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { outfitsRouter } from "./outfits.router";
import { wardrobeRouter } from "./wardrobe.router";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
	wardrobe: wardrobeRouter,
	outfits: outfitsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
