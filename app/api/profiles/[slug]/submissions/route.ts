import { prisma } from "@/lib/prisma";
import { parseImageDataUrl } from "@/lib/data-url";
import { allowRequest } from "@/lib/rate-limit";
import { isSpamText } from "@/lib/spam-check";
import { getRequestIp } from "@/lib/ip";
import { uploadImage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";

const MAX_SUBMISSION_BODY_BYTES = 1_600_000;
const MAX_IMAGE_BYTES = 1_000_000;

const submissionSchema = z.object({
  imageData: z.string().min(100),
  note: z.string().max(240).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_SUBMISSION_BODY_BYTES) {
      return NextResponse.json(
        { error: "Drawing is too large. Try a smaller canvas." },
        { status: 413 }
      );
    }

    const body = await req.json();
    const data = submissionSchema.parse(body);
    const { slug } = await params;

    const profile = await prisma.profile.findUnique({ where: { slug } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const ip = await getRequestIp();
    const rl = await allowRequest(`${ip}:${slug}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Slow down! Too many submissions." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "600",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rl.resetAt.toString(),
          },
        }
      );
    }

    if (isSpamText(data.note)) {
      return NextResponse.json(
        { error: "Note looks spammy. Try something else." },
        { status: 400 }
      );
    }

    const parsedImage = parseImageDataUrl(data.imageData);
    if (parsedImage.buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Drawing is too large. Try a smaller canvas." },
        { status: 400 }
      );
    }

    const id = uuid();
    const storageKey = `submissions/${profile.id}/${id}.webp`;
    const imageUrl = await uploadImage(storageKey, parsedImage.buffer, parsedImage.mimeType);

    const created = await prisma.submission.create({
      data: {
        id,
        profileId: profile.id,
        imageUrl,
        note: data.note?.trim() || null,
      },
    });

    return NextResponse.json({ submissionId: created.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Submission is invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body is invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit drawing";
    console.error("[api/submissions POST]", error);
    const status =
      error instanceof Error &&
      (message.includes("invalid") ||
        message.includes("supported") ||
        message.includes("empty") ||
        message.includes("too large"))
        ? 400
        : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
