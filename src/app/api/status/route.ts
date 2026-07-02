import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const redis = () => {
  const Redis = require("ioredis");
  return new Redis(parseInt(process.env.REDIS_PORT || "16379"), process.env.REDIS_HOST || "localhost");
};

export async function GET() {
  try {
    const r = redis();
    const [worker, ingester] = await Promise.all([
      r.get("fintrack:worker:paused"),
      r.get("fintrack:ingester:paused"),
    ]);
    await r.quit();
    return NextResponse.json({
      worker: worker !== "true",
      ingester: ingester !== "true",
    });
  } catch {
    return NextResponse.json({ worker: true, ingester: true });
  }
}

export async function POST(request: Request) {
  try {
    const { worker, ingester } = await request.json();
    const r = redis();
    const ops: Promise<any>[] = [];
    if (worker !== undefined) ops.push(worker ? r.del("fintrack:worker:paused") : r.set("fintrack:worker:paused", "true"));
    if (ingester !== undefined) ops.push(ingester ? r.del("fintrack:ingester:paused") : r.set("fintrack:ingester:paused", "true"));
    await Promise.all(ops);
    await r.quit();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
