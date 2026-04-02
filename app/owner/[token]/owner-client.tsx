"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

type Submission = {
  id: string;
  imageUrl: string;
  note: string | null;
  createdAtLabel: string;
};

interface OwnerClientProps {
  token: string;
  displayName: string;
  publicUrl: string;
  submissions: Submission[];
  initialHasMore: boolean;
}

export default function OwnerClient({
  token,
  displayName,
  publicUrl,
  submissions,
  initialHasMore,
}: OwnerClientProps) {
  const [items, setItems] = useState(submissions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(submissions.length);

  const deleteSubmission = async (id: string) => {
    const confirmed = window.confirm("Delete this drawing from your private inbox?");
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/owner/${token}/submissions/${id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete this drawing.");
      }

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete this drawing.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/owner/${token}/submissions?offset=${nextOffset}&limit=12`
      );
      const json = (await response.json()) as {
        error?: string;
        submissions?: Submission[];
        hasMore?: boolean;
      };
      if (!response.ok || !json.submissions) {
        throw new Error(json.error || "Failed to load more drawings.");
      }

      setItems((current) => [...current, ...json.submissions!]);
      setHasMore(Boolean(json.hasMore));
      setNextOffset((current) => current + json.submissions!.length);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load more drawings.";
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/15 bg-slate-950/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sky-300">
              Private Inbox
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {displayName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Only this private link can open these saved drawings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={publicUrl} />
            <a
              href={publicUrl}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/5"
            >
              Open public page
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Saved drawings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Share this public page</p>
            <p className="mt-2 truncate text-sm text-sky-200">{publicUrl}</p>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card className="border-dashed border-white/15 bg-white/5 p-10 text-center">
          <div className="flex justify-center text-slate-600">
            <PenLine size={48} strokeWidth={1} />
          </div>
          <p className="mt-4 text-lg font-medium text-white">Your inbox is empty</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Share your public link — the first sketch will appear here.
          </p>
          <div className="mt-5 flex justify-center">
            <CopyButton value={publicUrl} />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((submission) => (
            <Card
              key={submission.id}
              className="space-y-4 border-white/10 bg-slate-950/65 p-4"
            >
              <button
                type="button"
                className="block w-full"
                onClick={() => setSelectedSubmission(submission)}
              >
                <div className="relative flex aspect-4/5 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 p-3 transition hover:bg-slate-800">
                  {/* Standard img keeps private image routes simple and avoids unnecessary optimization work. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.imageUrl}
                    alt="Submitted drawing"
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </button>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {submission.createdAtLabel}
                </p>
                <p className="min-h-12 text-sm leading-6 text-slate-200">
                  {submission.note || "No note added."}
                </p>
                <p className="text-xs text-slate-400">
                  Tap or click the preview to open the full drawing.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deletingId === submission.id}
                onClick={() => deleteSubmission(submission.id)}
              >
                {deletingId === submission.id ? "Deleting..." : "Delete"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more drawings"}
          </Button>
        </div>
      ) : null}

      <Modal
        open={selectedSubmission !== null}
        onClose={() => setSelectedSubmission(null)}
        title={selectedSubmission ? `${displayName}'s saved drawing` : undefined}
        contentClassName="max-w-5xl bg-slate-950/95 p-4 sm:p-6"
      >
        {selectedSubmission ? (
          <div className="space-y-4">
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl bg-slate-950 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSubmission.imageUrl}
                alt="Saved drawing full view"
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {selectedSubmission.createdAtLabel}
              </p>
              <p className="text-sm leading-6 text-slate-200">
                {selectedSubmission.note || "No note added."}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
