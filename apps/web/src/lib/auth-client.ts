import type { Auth } from "@ai-stilist/auth";
import { SERVICE_URLS } from "@ai-stilist/shared/services";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

export const authClient = createAuthClient({
	baseURL: SERVICE_URLS[env.NEXT_PUBLIC_APP_ENV].auth,
	plugins: [inferAdditionalFields<Auth>()],
});
