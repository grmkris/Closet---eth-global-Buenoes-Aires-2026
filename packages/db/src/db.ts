import { join } from "node:path";
import type { Logger } from "@ai-stilist/logger";
import type { PGlite } from "@electric-sql/pglite";
import type { Logger as DrizzleLogger } from "drizzle-orm";
import { BunSQLDatabase, drizzle as drizzleBunSQL } from "drizzle-orm/bun-sql";
import { migrate as migrateBunSql } from "drizzle-orm/bun-sql/migrator";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePgLite } from "drizzle-orm/pglite/migrator";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as aiSchema from "./schema/ai/index";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as authSchema from "./schema/auth/index";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as wardrobeSchema from "./schema/wardrobe/index";

const schema = { ...authSchema, ...wardrobeSchema, ...aiSchema };

export const DB_SCHEMA = schema;
export type Database =
	| BunSQLDatabase<typeof schema>
	| PgliteDatabase<typeof schema>;

export function createDb(props: {
	logger?: DrizzleLogger;
	dbData:
		| {
				type: "pg";
				databaseUrl: string;
		  }
		| {
				type: "pglite";
				db: PGlite;
		  };
}): Database {
	const { logger, dbData } = props;

	const database =
		dbData.type === "pg"
			? drizzleBunSQL(dbData.databaseUrl, { schema, logger })
			: drizzlePglite(dbData.db, { schema, logger });

	return database;
}

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function withTransaction<T>(
	db: Database,
	callback: (tx: Transaction) => Promise<T>
): Promise<T> {
	return db.transaction(callback);
}

/**
 * Run database migrations
 * Automatically detects database type and uses appropriate migrator
 * @param db - Database instance (BunSQL or PGlite)
 * @param logger - Optional logger for migration progress
 */
export async function runMigrations(
	db: Database,
	logger?: Logger
): Promise<void> {
	logger?.info("Running database migrations");

	logger?.info({ msg: "Environment", env: process.env.NODE_ENV });
	// Resolve migrations folder
	// In development: import.meta.dir is packages/db/src, use relative path
	// In production/Docker: code is bundled, use process.cwd() (must be workspace root)
	const migrationsFolder =
		process.env.NODE_ENV === "production"
			? join(process.cwd(), "packages/db/drizzle")
			: join(import.meta.dir, "../drizzle");

	if (db instanceof BunSQLDatabase) {
		logger?.info({
			msg: "Running BunSQL migrations",
			folder: migrationsFolder,
		});
		await migrateBunSql(db, { migrationsFolder });
	} else if (db instanceof PgliteDatabase) {
		const currentDir = process.cwd();
		logger?.info({
			msg: "Running PGlite migrations",
			folder: migrationsFolder,
			currentDir,
			importMetaDir: import.meta.dir,
		});
		await migratePgLite(db, { migrationsFolder });
	} else {
		throw new Error("Unsupported database type");
	}

	logger?.info("Database migrations completed");
}
