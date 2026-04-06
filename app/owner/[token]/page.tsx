import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { mapOwnerSubmission, OWNER_SUBMISSIONS_PAGE_SIZE } from "@/lib/owner-submissions";
import { hashOwnerToken } from "@/lib/private-links";
import { prisma } from "@/lib/prisma";
import OwnerClient from "./owner-client";

export const revalidate = 0;

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const profile = await prisma.profile.findUnique({
    where: { ownerTokenHash: hashOwnerToken(token) },
  });

  if (!profile) return notFound();

  const submissions = await prisma.submission.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: OWNER_SUBMISSIONS_PAGE_SIZE + 1,
    select: {
      id: true,
      type: true,
      imageUrl: true,
      audioUrl: true,
      audioPreset: true,
      note: true,
      createdAt: true,
    },
  });

  const hasMore = submissions.length > OWNER_SUBMISSIONS_PAGE_SIZE;
  const initialSubmissions = hasMore
    ? submissions.slice(0, OWNER_SUBMISSIONS_PAGE_SIZE)
    : submissions;

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (host ? `${protocol}://${host}` : "http://localhost:3000");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10 lg:py-16">
      <OwnerClient
        token={token}
        displayName={profile.displayName}
        profileType={profile.type}
        publicUrl={`${origin}/${profile.slug}`}
        submissions={initialSubmissions.map(mapOwnerSubmission)}
        initialHasMore={hasMore}
      />
    </main>
  );
}