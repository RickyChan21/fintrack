import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase();
  const category = searchParams.get("category");
  const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : null;

  const where: any = {};

  if (category && category !== "all") {
    where.categoryName = category;
  }

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    where.transactionDate = { gte: cutoff };
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
    take: 100,
  });

  return NextResponse.json(transactions);
}
