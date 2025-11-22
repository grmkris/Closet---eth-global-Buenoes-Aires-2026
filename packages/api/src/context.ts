// TODO: Update auth context to return properly typed UserId instead of plain string
// This would eliminate the need for UserId.parse() in every router endpoint
import type { AiClient } from "@ai-stilist/ai";
import type { Auth } from "@ai-stilist/auth";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";

export type CreateContextOptions = {
	authClient: Auth;
	db: Database;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	logger: Logger;
	headers: Headers;
	requestId: RequestId;
};

export async function createContext({
	authClient,
	db,
	storage,
	queue,
	aiClient,
	logger,
	headers,
	requestId,
}: CreateContextOptions): Promise<{
	session: Awaited<ReturnType<typeof authClient.api.getSession>>;
	db: Database;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	logger: Logger;
	headers: Headers;
	requestId: RequestId;
}> {
	const session = await authClient.api.getSession({
		headers,
	});
	return {
		session,
		db,
		storage,
		queue,
		aiClient,
		logger,
		headers,
		requestId,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
