import type { AuthClient } from "@ai-stilist/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
	auth: AuthClient;
};

export async function createContext({ context, auth }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});
	return {
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
