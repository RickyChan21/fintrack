import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!prisma) return NextResponse.json([]);

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories.map((c) => c.name));
}
