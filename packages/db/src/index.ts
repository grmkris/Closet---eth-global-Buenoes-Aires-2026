import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

import { drizzle } from "drizzle-orm/node-postgres";
// biome-ignore lint/performance/noNamespaceImport: Schema needs to be imported as namespace for drizzle
import * as schema from "./schema/auth";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });
