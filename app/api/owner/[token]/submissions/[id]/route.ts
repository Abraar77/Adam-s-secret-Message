import { deleteImage } from "@/lib/storage";
import { hashOwnerToken } from "@/lib/private-links";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { ownerTokenHash: hashOwnerToken(token) },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // Fetch imageUrl before deletion so we can clean up storage
  const submission = await prisma.submission.findFirst({
    where: { id, profileId: profile.id },
    select: { imageUrl: true },
  });

  const result = await prisma.submission.deleteMany({
    where: { id, profileId: profile.id },
  });

  if (!result.count) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // Fire-and-forget — don't fail the response if storage cleanup fails
  if (submission?.imageUrl) {
    deleteImage(submission.imageUrl).catch((err) =>
      console.error("[storage] cleanup failed:", err)
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
