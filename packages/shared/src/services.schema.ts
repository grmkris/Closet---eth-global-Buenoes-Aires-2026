import { z } from "zod";

export const ENVIRONMENTS = ["dev", "prod"] as const;

export const Environment = z.enum(ENVIRONMENTS);
export type Environment = z.infer<typeof Environment>;

export const SERVICE_URLS: Record<
	Environment,
	{
		auth: string;
		api: string;
		web: string;
		cookieDomain: string;
		storage: string;
	}
> = {
	dev: {
		auth: "http://localhost:3000",
		api: "http://localhost:3000",
		web: "http://localhost:3001",
		cookieDomain: "localhost",
		storage: "http://localhost:9000",
	},
	prod: {
		auth: "https://api.ai-stilist.com",
		api: "https://api.ai-stilist.com",
		web: "https://ai-stilist.com",
		cookieDomain: ".ai-stilist.com",
		storage: "https://storage.ai-stilist.com",
	},
} as const;
