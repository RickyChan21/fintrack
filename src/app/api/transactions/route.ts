import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  if (!prisma) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase();
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const take = searchParams.get("take") ? parseInt(searchParams.get("take")!) : 100;

  const where: any = {};

  if (category && category !== "all") {
    where.categoryName = category;
  }

  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
    if (dateTo) where.transactionDate.lte = new Date(dateTo + "T23:59:59");
  }

  if (query) {
    where.OR = [
      { merchant: { contains: query, mode: "insensitive" } },
      { categoryName: { contains: query, mode: "insensitive" } },
      { bank: { contains: query, mode: "insensitive" } },
      { transactionType: { contains: query, mode: "insensitive" } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    take,
  });

  return NextResponse.json(transactions);
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id, merchant } = await request.json();
  if (!id || !merchant) return NextResponse.json({ error: "ID and merchant required" }, { status: 400 });

  await prisma.transaction.update({ where: { id }, data: { merchant } });
  return NextResponse.json({ ok: true });
}
