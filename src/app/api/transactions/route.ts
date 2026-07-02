import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  if (!prisma) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase();
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const take = searchParams.get("take") ? parseInt(searchParams.get("take")!) : 25;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;

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

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, take });
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id, merchant, renameAll, oldMerchant } = await request.json();

  if (renameAll && oldMerchant && merchant) {
    await prisma.transaction.updateMany({
      where: { merchant: oldMerchant },
      data: { merchant },
    });
    return NextResponse.json({ ok: true, count: "all" });
  }

  if (!id || !merchant) return NextResponse.json({ error: "ID and merchant required" }, { status: 400 });

  await prisma.transaction.update({ where: { id }, data: { merchant } });
  return NextResponse.json({ ok: true });
}
