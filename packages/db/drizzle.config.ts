import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

export default defineConfig({
	schema: [
		"./src/schema/auth",
		"./src/schema/wardrobe",
		"./src/schema/ai",
		"./src/schema/subscriptions",
		"./src/schema/agents",
		"./src/schema/spending",
	],
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
