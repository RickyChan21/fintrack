import { Queue, Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "16379"),
};

const QUEUE_NAME = process.env.REDIS_QUEUE || "fintrack_queue";

export const queue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 4000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 86400 * 7 },
  },
});

export function createWorker(processor: (data: any) => Promise<void>) {
  return new Worker(QUEUE_NAME, async (job) => { await processor(job.data); }, {
    connection,
    concurrency: 1,
  });
}
