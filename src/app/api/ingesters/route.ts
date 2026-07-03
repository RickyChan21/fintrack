import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!prisma) return NextResponse.json([]);
  const configs = await prisma.ingesterConfig.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });
  const { name, searchQuery, labelDone, pollInterval } = await request.json();
  if (!name || !searchQuery) return NextResponse.json({ error: "Required" }, { status: 400 });
  const config = await prisma.ingesterConfig.create({
    data: { name, searchQuery, labelDone: labelDone || "fintrack_processed", pollInterval: pollInterval || 300 },
  });
  return NextResponse.json(config, { status: 201 });
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });
  const { id, ...data } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const config = await prisma.ingesterConfig.update({ where: { id }, data });
  return NextResponse.json(config);
}

export async function DELETE(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });
  const id = parseInt(new URL(request.url).searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.ingesterConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
