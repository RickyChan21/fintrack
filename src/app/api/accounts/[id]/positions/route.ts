import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json([]);
  const { id } = await params;
  const accountId = parseInt(id);
  if (!accountId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const positions = await prisma.position.findMany({
    where: { accountId },
    orderBy: { ticker: "asc" },
  });

  return NextResponse.json(positions);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id } = await params;
  const accountId = parseInt(id);
  if (!accountId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const position = await prisma.position.upsert({
    where: { accountId_ticker: { accountId, ticker: body.ticker } },
    update: { shares: body.shares },
    create: { accountId, ticker: body.ticker, shares: body.shares },
  });

  return NextResponse.json(position, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id } = await params;
  const accountId = parseInt(id);
  if (!accountId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });

  await prisma.position.delete({
    where: { accountId_ticker: { accountId, ticker } },
  });

  return NextResponse.json({ success: true });
}
