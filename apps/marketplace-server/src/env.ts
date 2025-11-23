import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().default(3003),
	APP_ENV: z.enum(["dev", "prod"]).default("dev"),
	DATABASE_URL: z.string(),
	POLYGON_RPC_URL: z.string().url(),
	FACILITATOR_URL: z.string().url(),
	MERCHANT_WALLET_ADDRESS: z.string(),
	CORS_ORIGIN: z.string().url(),
});

export const env = envSchema.parse(process.env);
