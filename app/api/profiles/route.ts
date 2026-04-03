import { prisma } from "@/lib/prisma";
import {
  createOwnerToken,
  getRequestOrigin,
  hashOwnerToken,
  normalizeDisplayName,
  slugifyDisplayName,
  withSlugSuffix,
} from "@/lib/private-links";
import { allowRequest } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/ip";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";

const createSchema = z.object({
  displayName: z
    .string()
    .max(60)
    .transform((value) => normalizeDisplayName(value))
    .refine((value) => value.length > 0, {
      message: "Name is required.",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const ip = await getRequestIp();
    const rl = await allowRequest(`signup:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many signups right now. Try again in a few minutes." },
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

    const body = await req.json();
    const data = createSchema.parse(body);

    const displayName = data.displayName;
    const slug = withSlugSuffix(slugifyDisplayName(displayName));
    const ownerToken = createOwnerToken();
    const ownerTokenHash = hashOwnerToken(ownerToken);

    const profile = await prisma.profile.create({
      data: {
        id: uuid(),
        displayName,
        slug,
        ownerTokenHash,
      },
      select: {
        displayName: true,
        slug: true,
      },
    });

    const origin = getRequestOrigin(req.url);

    return NextResponse.json(
      {
        profile: {
          displayName: profile.displayName,
          slug: profile.slug,
        },
        publicUrl: `${origin}/${profile.slug}`,
        ownerUrl: `${origin}/owner/${ownerToken}`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Name is invalid." },
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
      error instanceof Error ? error.message : "Failed to create profile";
    console.error("[api/profiles POST]", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
