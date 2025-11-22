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
		redis: string;
		chain: {
			id: number;
			name: string;
			rpcUrl: string;
		};
	}
> = {
	dev: {
		auth: "http://localhost:3000",
		api: "http://localhost:3000",
		web: "http://localhost:3001",
		cookieDomain: "localhost",
		storage: "http://localhost:9000",
		redis: "redis://localhost:63791",
		chain: {
			id: 80_002, // Polygon Amoy testnet
			name: "polygon-amoy",
			rpcUrl: "https://polygon-amoy.gateway.tatum.io",
		},
	},
	prod: {
		auth: "https://api.ai-stilist.com",
		api: "https://api.ai-stilist.com",
		web: "https://ai-stilist.com",
		cookieDomain: ".ai-stilist.com",
		storage: "https://storage.ai-stilist.com",
		redis: "redis://redis.ai-stilist.com:6379",
		chain: {
			id: 137, // Polygon mainnet
			name: "polygon",
			rpcUrl: "https://polygon-rpc.com",
		},
	},
} as const;
