import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", ts: Date.now() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[health] db check failed:", err);
    return NextResponse.json(
      { status: "degraded", db: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
