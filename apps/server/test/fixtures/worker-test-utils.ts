import type { JobType, QueueClient } from "@ai-stilist/queue";
import { waitFor } from "../test-helpers";

/**
 * Wait for a job to complete (either successfully or with failure)
 */
export async function waitForJobCompletion(
	queue: QueueClient,
	jobId: string,
	queueName: JobType,
	options: {
		timeout?: number;
		interval?: number;
	} = {}
): Promise<"completed" | "failed"> {
	const { timeout = 10_000, interval = 100 } = options;

	let finalState: "completed" | "failed" | null = null;

	await waitFor(
		async () => {
			const status = await queue.getJobStatus(queueName, jobId);
			if (!status) {
				throw new Error(`Job ${jobId} not found in queue ${queueName}`);
			}

			if (status.state === "completed") {
				finalState = "completed";
				return true;
			}

			if (status.state === "failed") {
				finalState = "failed";
				return true;
			}

			return false;
		},
		{
			timeout,
			interval,
			timeoutMessage: `Job ${jobId} did not complete within ${timeout}ms. Last state: ${finalState}`,
		}
	);

	return finalState!;
}

/**
 * Wait for a job to reach a specific state
 */
export async function waitForJobState(
	queue: QueueClient,
	jobId: string,
	queueName: JobType,
	targetState: string,
	options: {
		timeout?: number;
		interval?: number;
	} = {}
): Promise<void> {
	const { timeout = 5000, interval = 100 } = options;

	await waitFor(
		async () => {
			const status = await queue.getJobStatus(queueName, jobId);
			return status?.state === targetState;
		},
		{
			timeout,
			interval,
			timeoutMessage: `Job ${jobId} did not reach state ${targetState} within ${timeout}ms`,
		}
	);
}

/**
 * Get count of jobs in queue by state
 */
export async function getJobCount(
	queue: QueueClient,
	queueName: JobType,
	state: "active" | "waiting" | "completed" | "failed" | "delayed"
): Promise<number> {
	const bullQueue = queue.queues[queueName];

	switch (state) {
		case "active":
			return await bullQueue.getActiveCount();
		case "waiting":
			return await bullQueue.getWaitingCount();
		case "completed":
			return await bullQueue.getCompletedCount();
		case "failed":
			return await bullQueue.getFailedCount();
		case "delayed":
			return await bullQueue.getDelayedCount();
		default:
			throw new Error(`Unknown job state: ${state}`);
	}
}

/**
 * Clear all jobs from a queue
 */
export async function clearQueue(
	queue: QueueClient,
	queueName: JobType
): Promise<void> {
	const bullQueue = queue.queues[queueName];
	await bullQueue.obliterate({ force: true });
}

/**
 * Get job data and result
 */
export async function getJobDetails<T extends JobType>(
	queue: QueueClient,
	jobId: string,
	queueName: T
) {
	const status = await queue.getJobStatus(queueName, jobId);

	if (!status) {
		return null;
	}

	return {
		id: status.jobId,
		state: status.state,
		data: status.data,
		result: status.returnvalue,
		error: status.failedReason,
	};
}

/**
 * Assert that a job completed successfully
 */
export async function assertJobCompleted(
	queue: QueueClient,
	jobId: string,
	queueName: JobType
): Promise<void> {
	const status = await queue.getJobStatus(queueName, jobId);

	if (!status) {
		throw new Error(`Job ${jobId} not found`);
	}

	if (status.state === "failed") {
		throw new Error(`Job ${jobId} failed: ${status.failedReason}`);
	}

	if (status.state !== "completed") {
		throw new Error(
			`Job ${jobId} is in state ${status.state}, expected completed`
		);
	}
}

/**
 * Assert that a job failed
 */
export async function assertJobFailed(
	queue: QueueClient,
	jobId: string,
	queueName: JobType,
	expectedErrorPattern?: string | RegExp
): Promise<void> {
	const status = await queue.getJobStatus(queueName, jobId);

	if (!status) {
		throw new Error(`Job ${jobId} not found`);
	}

	if (status.state !== "failed") {
		throw new Error(
			`Job ${jobId} is in state ${status.state}, expected failed`
		);
	}

	if (expectedErrorPattern && status.failedReason) {
		const matches =
			typeof expectedErrorPattern === "string"
				? status.failedReason.includes(expectedErrorPattern)
				: expectedErrorPattern.test(status.failedReason);

		if (!matches) {
			throw new Error(
				`Job ${jobId} failed with "${status.failedReason}", expected pattern: ${expectedErrorPattern}`
			);
		}
	}
}
