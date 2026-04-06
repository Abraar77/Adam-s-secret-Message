// ---------------------------------------------------------------------------
// Cleanup route: deletes all expired submissions (DB rows + storage files).
// Called by the Vercel cron job daily at 03:00 UTC.
// Also safe to call manually with the correct CRON_SECRET.
//
// Deletion strategy:
//   1. Query up to BATCH_SIZE submissions where expiresAt <= now().
//   2. For each, fire storage deletes concurrently (fire-and-forget per item,
//      but we await the whole batch so errors surface in logs).
//   3. Delete the DB rows in one deleteMany call.
//   4. Repeat until no more expired rows remain.
//
// Idempotent: re-running is safe. If a storage delete already succeeded but
// the DB delete failed on a previous run, the next run deletes the DB row
// again (storage delete will be a no-op / 404 which we swallow).
// ---------------------------------------------------------------------------

import { deleteFile } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  // Authenticate: Vercel passes Authorization: Bearer <CRON_SECRET> automatically.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  let totalDeleted = 0;

  // Process in batches to avoid long-running queries and memory spikes.
  for (;;) {
    const expired = await prisma.submission.findMany({
      where: { expiresAt: { lte: now } },
      take: BATCH_SIZE,
      select: { id: true, imageUrl: true, audioUrl: true },
    });

    if (expired.length === 0) break;

    // Delete storage files concurrently; swallow individual errors so one
    // bad URL doesn't block the rest of the batch.
    await Promise.all(
      expired.flatMap((s) => {
        const tasks: Promise<void>[] = [];
        if (s.imageUrl) {
          tasks.push(
            deleteFile(s.imageUrl).catch((err) =>
              console.error("[cleanup] image delete failed:", s.id, err),
            ),
          );
        }
        if (s.audioUrl) {
          tasks.push(
            deleteFile(s.audioUrl).catch((err) =>
              console.error("[cleanup] audio delete failed:", s.id, err),
            ),
          );
        }
        return tasks;
      }),
    );

    const ids = expired.map((s) => s.id);
    const { count } = await prisma.submission.deleteMany({
      where: { id: { in: ids } },
    });
    totalDeleted += count;

    // If we got fewer rows than the batch size we've exhausted the set.
    if (expired.length < BATCH_SIZE) break;
  }

  console.log(`[cleanup] deleted ${totalDeleted} expired submissions`);
  return NextResponse.json({ deleted: totalDeleted });
}

// Vercel cron jobs use GET by convention when no body is needed, but we also
// support GET so the cron config in vercel.json can use a simple path hit.
export async function GET(req: NextRequest) {
  return POST(req);
}