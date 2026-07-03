import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!prisma) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") || "1");
  const take = parseInt(searchParams.get("take") || "25");

  const where: any = {};

  if (source) where.source = source;
  if (category) where.category = category;
  if (dateFrom || dateTo) {
    where.incomeDate = {};
    if (dateFrom) where.incomeDate.gte = new Date(dateFrom);
    if (dateTo) where.incomeDate.lte = new Date(dateTo + "T23:59:59");
  }

  const [income, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: { incomeDate: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.income.count({ where }),
  ]);

  return NextResponse.json({ income, total, page, take });
}

export async function POST(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const body = await request.json();
  const income = await prisma.income.create({
    data: {
      amount: body.amount,
      source: body.source,
      category: body.category,
      incomeDate: new Date(body.incomeDate),
      notes: body.notes || null,
    },
  });

  return NextResponse.json(income, { status: 201 });
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const body = await request.json();
  const income = await prisma.income.update({
    where: { id: body.id },
    data: {
      amount: body.amount,
      source: body.source,
      category: body.category,
      incomeDate: new Date(body.incomeDate),
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(income);
}

export async function DELETE(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
