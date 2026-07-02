import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { Queue } = require("bullmq");
    const q = new Queue(process.env.REDIS_QUEUE || "fintrack_queue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "16379"),
      },
    });

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
      q.getDelayedCount(),
    ]);

    await q.close();

    return NextResponse.json({ waiting, active, completed, failed, delayed });
  } catch {
    return NextResponse.json({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
  }
}
