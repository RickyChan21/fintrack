import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json([]);
  const { id } = await params;
  const accountId = parseInt(id);
  if (!accountId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const balances = await prisma.balance.findMany({
    where: { accountId },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(balances);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id } = await params;
  const accountId = parseInt(id);
  if (!accountId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const balance = await prisma.balance.create({
    data: {
      accountId,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });

  return NextResponse.json(balance, { status: 201 });
}
