import { Environment } from "@ai-stilist/shared/services";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {},
	client: {
		NEXT_PUBLIC_APP_ENV: Environment,
		NEXT_PUBLIC_CDP_PROJECT_ID: z.string().min(1),
	},
	experimental__runtimeEnv: {
		NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
		NEXT_PUBLIC_CDP_PROJECT_ID: process.env.NEXT_PUBLIC_CDP_PROJECT_ID,
	},
});
