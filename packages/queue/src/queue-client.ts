import type { Logger } from "@ai-stilist/logger";
import { NUMERIC_CONSTANTS, WORKER_CONFIG } from "@ai-stilist/shared/constants";
import { Queue, Worker } from "bullmq";

import { Redis } from "ioredis";

import type { AnalyzeImageJob } from "./jobs/analyze-image-job";
import type { ProcessImageJob } from "./jobs/process-image-job";

export type QueueConfig = {
	url: string;
	logger?: Logger;
};

export type JobType = "process-image" | "analyze-image";

export type JobData = {
	"process-image": ProcessImageJob;
	"analyze-image": AnalyzeImageJob;
};

export type JobResult = {
	"process-image": { success: boolean; itemId: string };
	"analyze-image": { success: boolean; itemId: string };
};

export function createQueueClient(config: QueueConfig) {
	const { url, logger } = config;
	const redis = new Redis(url, { maxRetriesPerRequest: null });

	const connection = redis;

	// Create queues
	const queues = {
		"process-image": new Queue<ProcessImageJob>("process-image", {
			connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 2000,
				},
				removeOnComplete: {
					count: 100,
					age: 24 * WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS, // 24 hours
				},
				removeOnFail: {
					count: 1000,
					age:
						NUMERIC_CONSTANTS.SEVEN_DAYS *
						24 *
						WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS, // 7 days
				},
			},
		}),
		"analyze-image": new Queue<AnalyzeImageJob>("analyze-image", {
			connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 2000,
				},
				removeOnComplete: {
					count: 100,
					age: 24 * WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS, // 24 hours
				},
				removeOnFail: {
					count: 1000,
					age:
						NUMERIC_CONSTANTS.SEVEN_DAYS *
						24 *
						WORKER_CONFIG.SIGNED_URL_EXPIRY_SECONDS, // 7 days
				},
			},
		}),
	};

	/**
	 * Add a job to a queue
	 */
	async function addJob<T extends JobType>(
		queueName: T,
		data: JobData[T],
		options?: { priority?: number; delay?: number }
	) {
		try {
			logger?.debug({ msg: "Adding job to queue", queueName, data });

			const queue = queues[queueName] as unknown as Queue<JobData[T]>;
			const job = await queue.add(queueName as never, data as never, {
				priority: options?.priority,
				delay: options?.delay,
			});

			logger?.info({ msg: "Job added successfully", queueName, jobId: job.id });

			return { jobId: job.id, queue: queueName };
		} catch (error) {
			logger?.error({ msg: "Failed to add job", queueName, error });
			throw new Error(`Failed to add job to queue: ${queueName}`);
		}
	}

	/**
	 * Create a worker for processing jobs
	 */
	function createWorker<T extends JobType>(
		queueName: T,
		processor: (job: JobData[T]) => Promise<JobResult[T]>,
		options?: {
			concurrency?: number;
			onFailed?: (job: JobData[T], error: Error) => Promise<void>;
		}
	) {
		const worker = new Worker<JobData[T], JobResult[T]>(
			queueName,
			async (job) => {
				logger?.info({ msg: "Processing job", queueName, jobId: job.id });

				try {
					const result = await processor(job.data);
					logger?.info({ msg: "Job completed", queueName, jobId: job.id });
					return result;
				} catch (error) {
					logger?.error({ msg: "Job failed", queueName, jobId: job.id, error });
					throw error;
				}
			},
			{
				connection,
				concurrency: options?.concurrency || WORKER_CONFIG.MAX_CONCURRENT_JOBS,
			}
		);

		worker.on("failed", async (job, error) => {
			logger?.error({
				msg: "Job failed permanently after all retries",
				queueName,
				jobId: job?.id,
				attemptsMade: job?.attemptsMade,
				error,
			});

			// Call custom failure handler if provided
			if (options?.onFailed && job) {
				try {
					await options.onFailed(job.data, error);
				} catch (callbackError) {
					logger?.error({
						msg: "Failure callback error",
						queueName,
						jobId: job.id,
						error: callbackError,
					});
				}
			}
		});

		worker.on("error", (error) => {
			logger?.error({
				msg: "Worker error",
				queueName,
				error,
			});
		});

		return worker;
	}

	/**
	 * Get job status
	 */
	async function getJobStatus<T extends JobType>(queueName: T, jobId: string) {
		const queue = queues[queueName];
		const job = await queue.getJob(jobId);

		if (!job) {
			return null;
		}

		const state = await job.getState();

		return {
			jobId: job.id,
			state,
			progress: job.progress,
			data: job.data,
			returnvalue: job.returnvalue,
			failedReason: job.failedReason,
		};
	}

	/**
	 * Close all queue connections
	 */
	async function close() {
		logger?.info({ msg: "Closing queue connections" });

		await Promise.all(Object.values(queues).map((queue) => queue.close()));

		logger?.info({ msg: "Queue connections closed" });
	}

	return {
		addJob,
		createWorker,
		getJobStatus,
		close,
		queues,
	};
}

export type QueueClient = ReturnType<typeof createQueueClient>;
