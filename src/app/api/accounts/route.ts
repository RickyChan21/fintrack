import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!prisma) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);

  if (searchParams.get("type") === "net-worth") {
    const accounts = await prisma.account.findMany({
      include: { balances: { orderBy: { date: "asc" } } },
    });
    const netWorthByDate: Record<string, number> = {};
    for (const account of accounts) {
      const multiplier = account.type === "credit" ? -1 : 1;
      for (const balance of account.balances) {
        const key = balance.date.toISOString().slice(0, 10);
        netWorthByDate[key] = (netWorthByDate[key] || 0) + balance.amount * multiplier;
      }
    }
    const data = Object.entries(netWorthByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
    return NextResponse.json(data);
  }

  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      balances: { orderBy: { date: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const body = await request.json();
  const account = await prisma.account.create({
    data: {
      name: body.name,
      type: body.type,
      subtype: body.subtype || null,
      currency: body.currency || "USD",
      institution: body.institution || null,
      color: body.color || "#3b82f6",
      network: body.network || null,
    },
  });

  if (body.balance != null) {
    await prisma.balance.create({
      data: { accountId: account.id, amount: body.balance },
    });
  }

  const full = await prisma.account.findUnique({
    where: { id: account.id },
    include: { balances: { orderBy: { date: "desc" }, take: 1 } },
  });

  return NextResponse.json(full, { status: 201 });
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const body = await request.json();
  const account = await prisma.account.update({
    where: { id: body.id },
    data: {
      name: body.name,
      type: body.type,
      subtype: body.subtype,
      currency: body.currency,
      institution: body.institution,
      color: body.color,
      network: body.network,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(account);
}

export async function DELETE(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
