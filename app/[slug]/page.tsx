import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import DrawClient from "./draw-client";

export const revalidate = 0;

export default async function DrawPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { _count: { select: { submissions: true } } },
  });

  if (!profile) return notFound();

  const count = profile._count.submissions;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10 lg:py-16">
      <Card className="border-white/15 bg-slate-950/65 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-300">
          Public Drawing Page
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Draw something for {profile.displayName}
          </h1>
          {count > 0 && (
            <span className="rounded-full border border-sky-400/30 bg-sky-900/30 px-3 py-1 text-sm text-sky-300">
              {count} drawing{count !== 1 ? "s" : ""} sent
            </span>
          )}
        </div>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Your drawing and optional note will be saved privately. Only{" "}
          {profile.displayName} can open the submissions inbox.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <DrawClient slug={profile.slug} displayName={profile.displayName} />

        <Card className="min-w-0 border-white/10 bg-slate-950/55 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-sky-200">
            How it works
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
            <p>1. Draw directly on the canvas using the pen, stamps, or emoji.</p>
            <p>2. Click &ldquo;Prepare drawing&rdquo; to capture what you made.</p>
            <p>3. Add an anonymous note if you want, then send it.</p>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-400">
            No account is needed to submit. Previously sent drawings are not
            visible on this page.
          </div>
        </Card>
      </div>
    </main>
  );
}
