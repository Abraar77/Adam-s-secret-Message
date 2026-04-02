import { NextRequest, NextResponse } from "next/server";
import {
  mapOwnerSubmission,
  OWNER_SUBMISSIONS_MAX_PAGE_SIZE,
  OWNER_SUBMISSIONS_PAGE_SIZE,
} from "@/lib/owner-submissions";
import { hashOwnerToken } from "@/lib/private-links";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const profile = await prisma.profile.findUnique({
    where: { ownerTokenHash: hashOwnerToken(token) },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const limit = Math.min(
    OWNER_SUBMISSIONS_MAX_PAGE_SIZE,
    Math.max(
      1,
      Number(searchParams.get("limit") ?? `${OWNER_SUBMISSIONS_PAGE_SIZE}`) ||
        OWNER_SUBMISSIONS_PAGE_SIZE
    )
  );

  const rows = await prisma.submission.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit + 1,
    select: { id: true, imageUrl: true, note: true, createdAt: true },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json(
    { submissions: pageRows.map(mapOwnerSubmission), hasMore },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
