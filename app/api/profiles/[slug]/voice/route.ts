import { prisma } from "@/lib/prisma";
import { parseAudioDataUrl } from "@/lib/audio-data";
import { allowRequest } from "@/lib/rate-limit";
import { isSpamText } from "@/lib/spam-check";
import { getRequestIp } from "@/lib/ip";
import { uploadAudio } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";

const MAX_VOICE_BODY_BYTES = 3_000_000;
const MAX_AUDIO_BYTES = 2_000_000;
const VOICE_EXPIRY_DAYS = 2;

const VALID_PRESETS = ["normal", "deep", "chipmunk", "robot", "telephone"] as const;

const voiceSchema = z.object({
  audioData: z.string().min(50),
  preset: z.enum(VALID_PRESETS).default("normal"),
  note: z.string().max(240).optional(),
});

// Audio file extensions by base MIME type
const AUDIO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg":  "ogg",
  "audio/mp4":  "m4a",
  "audio/mpeg": "mp3",
  "audio/wav":  "wav",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_VOICE_BODY_BYTES) {
      return NextResponse.json(
        { error: "Voice note is too large. Please keep it under 90 seconds." },
        { status: 413 },
      );
    }

    const body = await req.json();
    const data = voiceSchema.parse(body);
    const { slug } = await params;

    const profile = await prisma.profile.findUnique({ where: { slug } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.type !== "VOICE") {
      return NextResponse.json(
        { error: "This link is not set up for voice notes." },
        { status: 400 },
      );
    }

    const ip = await getRequestIp();
    const rl = await allowRequest(`voice:${ip}:${slug}`);
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
        },
      );
    }

    if (isSpamText(data.note)) {
      return NextResponse.json(
        { error: "Note looks spammy. Try something else." },
        { status: 400 },
      );
    }

    const parsed = parseAudioDataUrl(data.audioData);
    if (parsed.buffer.byteLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Voice note is too large. Please keep it under 90 seconds." },
        { status: 400 },
      );
    }

    const id = uuid();
    const baseType = parsed.mimeType.split(";")[0];
    const ext = AUDIO_EXT[baseType] ?? "webm";
    const storageKey = `voice/${profile.id}/${id}.${ext}`;
    const audioUrl = await uploadAudio(storageKey, parsed.buffer, parsed.mimeType);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VOICE_EXPIRY_DAYS);

    const created = await prisma.submission.create({
      data: {
        id,
        profileId: profile.id,
        type: "VOICE",
        audioUrl,
        audioPreset: data.preset,
        note: data.note?.trim() || null,
        expiresAt,
      },
    });

    return NextResponse.json(
      { submissionId: created.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Submission is invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body is invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to submit voice note";
    console.error("[api/voice POST]", error);
    const status =
      error instanceof Error &&
      (message.includes("invalid") ||
        message.includes("Unsupported") ||
        message.includes("empty") ||
        message.includes("too large"))
        ? 400
        : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}