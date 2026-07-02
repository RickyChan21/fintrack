import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!prisma) return NextResponse.json([]);
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { name, color } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();
  const existing = await prisma.category.findUnique({ where: { name: trimmed } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { name: trimmed, color: color || "#10b981" },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { id, name, color } = await request.json();
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  const category = await prisma.category.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(color ? { color } : {}) },
  });
  return NextResponse.json(category);
}

export async function DELETE(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  // Unlink transactions first
  await prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
