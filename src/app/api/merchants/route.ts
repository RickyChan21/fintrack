import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!prisma) return NextResponse.json([]);
  const merchants = await prisma.merchant.findMany({
    orderBy: { name: "asc" },
    include: { category: true, aliases: true },
  });
  return NextResponse.json(merchants);
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id, name, categoryId } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data: any = {};
  if (name) data.name = name;
  if (categoryId !== undefined) data.categoryId = categoryId;

  await prisma.merchant.update({ where: { id }, data });

  // Sync display name and category to all linked transactions
  if (name) {
    await prisma.transaction.updateMany({ where: { merchantId: id }, data: { merchant: name } });
  }
  if (categoryId !== undefined) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (cat) {
      await prisma.transaction.updateMany({ where: { merchantId: id }, data: { categoryId, categoryName: cat.name } });
    }
  }

  return NextResponse.json({ ok: true });
}
