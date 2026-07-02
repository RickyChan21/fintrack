import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!prisma) return NextResponse.json([]);
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories.map((c) => c.name));
}

export async function POST(request: Request) {
  if (!prisma) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();
  const existing = await prisma.category.findUnique({ where: { name: trimmed } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.category.create({ data: { name: trimmed } });
  return NextResponse.json(category, { status: 201 });
}
