import { Environment } from "@ai-stilist/shared/services";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
	server: {},
	client: {
		NEXT_PUBLIC_APP_ENV: Environment,
	},
	experimental__runtimeEnv: {
		NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
	},
});
