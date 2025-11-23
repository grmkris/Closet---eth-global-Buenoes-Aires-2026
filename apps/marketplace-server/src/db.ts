import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as schema from "../drizzle/schema";

export function createDatabase(url: string) {
	const client = postgres(url);
	return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
