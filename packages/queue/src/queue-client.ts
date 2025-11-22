import type { Logger } from "@ai-stilist/logger";
import { Queue, Worker } from "bullmq";
import type Redis from "ioredis";
import type { ProcessImageJob } from "./jobs/process-image-job";

export type QueueConfig = {
	redis: Redis;
	logger?: Logger;
};

export type JobType = "process-image";

export type JobData = {
	"process-image": ProcessImageJob;
};

export type JobResult = {
	"process-image": { success: boolean; itemId: string };
};

export function createQueueClient(config: QueueConfig) {
	const { redis, logger } = config;

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
					age: 24 * 3600, // 24 hours
				},
				removeOnFail: {
					count: 1000,
					age: 7 * 24 * 3600, // 7 days
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

			const queue = queues[queueName];
			const job = await queue.add(queueName, data, {
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
		options?: { concurrency?: number }
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
				concurrency: options?.concurrency || 5,
			}
		);

		worker.on("failed", (job, error) => {
			logger?.error({
				msg: "Job failed permanently",
				queueName,
				jobId: job?.id,
				error,
			});
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
