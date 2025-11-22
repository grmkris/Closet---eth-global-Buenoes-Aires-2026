import { type Environment, SERVICE_URLS } from "@ai-stilist/shared/services";
import { inferAdditionalFields, siweClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "./auth-config";

export const createAuthWebClient = (props: { appEnv: Environment }) =>
	createAuthClient({
		baseURL: SERVICE_URLS[props.appEnv].auth,
		plugins: [inferAdditionalFields<Auth>(), siweClient()],
	});
