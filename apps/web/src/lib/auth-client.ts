import { createAuthWebClient } from "@ai-stilist/auth/auth-client";
import { env } from "@/env";

export const authClient = createAuthWebClient({
	appEnv: env.NEXT_PUBLIC_APP_ENV,
});
