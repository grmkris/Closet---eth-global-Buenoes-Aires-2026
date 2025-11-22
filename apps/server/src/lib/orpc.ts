import type { AiClient } from "@ai-stilist/ai";
import type { Auth } from "@ai-stilist/auth";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";

export type OrpcContextParams = {
	db: Database;
	logger: Logger;
	authClient: Auth;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	headers: Headers;
	requestId: RequestId;
};
