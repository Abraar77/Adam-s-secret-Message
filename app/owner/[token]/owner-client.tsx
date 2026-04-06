"use client";

import { useRef, useState } from "react";
import { Mic, PenLine, Play, Square } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { connectEffect, type VoicePreset } from "@/lib/voice-effects";
import type { OwnerSubmissionListItem } from "@/lib/owner-submissions";
import { cn } from "@/lib/utils";

// ── Voice player ──────────────────────────────────────────────────────────────

function VoicePlayer({ audioUrl, preset }: { audioUrl: string; preset: string }) {
  const [state, setState]   = useState<"idle" | "loading" | "playing">("idle");
  const stopRef             = useRef<(() => void) | null>(null);
  const ctxRef              = useRef<AudioContext | null>(null);

  const toggle = async () => {
    if (state === "playing") {
      stopRef.current?.();
      stopRef.current = null;
      setState("idle");
      return;
    }

    setState("loading");
    try {
      await ctxRef.current?.close();
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error("Could not load audio.");
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const cleanup = connectEffect(ctx, source, preset as VoicePreset, ctx.destination);

      source.onended = () => {
        cleanup();
        ctx.close();
        setState("idle");
        stopRef.current = null;
      };

      source.start(0);
      setState("playing");
      stopRef.current = () => {
        try { source.stop(); } catch { /* already ended */ }
        cleanup();
        ctx.close();
      };
    } catch (err) {
      console.error("Playback failed:", err);
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
        state === "playing"
          ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
      )}
    >
      {state === "loading" ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      ) : state === "playing" ? (
        <Square size={13} />
      ) : (
        <Play size={13} />
      )}
      {state === "loading" ? "Loading…" : state === "playing" ? "Stop" : "Play"}
      {state !== "loading" && (
        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">
          {preset}
        </span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OwnerClientProps {
  token: string;
  displayName: string;
  profileType: "DRAWING" | "VOICE";
  publicUrl: string;
  submissions: OwnerSubmissionListItem[];
  initialHasMore: boolean;
}

export default function OwnerClient({
  token,
  displayName,
  profileType,
  publicUrl,
  submissions,
  initialHasMore,
}: OwnerClientProps) {
  const [items, setItems]       = useState(submissions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<OwnerSubmissionListItem | null>(null);
  const [hasMore, setHasMore]   = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset]   = useState(submissions.length);

  const isVoice = profileType === "VOICE";
  const noun = isVoice ? "voice note" : "drawing";
  const Noun = isVoice ? "Voice note" : "Drawing";

  const deleteItem = async (id: string) => {
    if (!window.confirm(`Delete this ${noun} from your private inbox?`)) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/${token}/submissions/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Failed to delete this ${noun}.`);
      setItems((cur) => cur.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete this ${noun}.`);
    } finally {
      setDeletingId(null);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/${token}/submissions?offset=${nextOffset}&limit=12`);
      const json = (await res.json()) as {
        error?: string;
        submissions?: OwnerSubmissionListItem[];
        hasMore?: boolean;
      };
      if (!res.ok || !json.submissions) throw new Error(json.error || `Failed to load more ${noun}s.`);
      setItems((cur) => [...cur, ...json.submissions!]);
      setHasMore(Boolean(json.hasMore));
      setNextOffset((cur) => cur + json.submissions!.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load more ${noun}s.`);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header card ── */}
      <Card className="border-white/15 bg-slate-950/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Private Inbox</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{displayName}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Only this private link can open these saved {noun}s.
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
            <p className="text-sm text-slate-300">Saved {noun}s</p>
            <p className="mt-2 text-3xl font-semibold text-white">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Share this public page</p>
            <p className="mt-2 truncate text-sm text-sky-200">{publicUrl}</p>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </Card>

      {/* ── Empty state ── */}
      {items.length === 0 ? (
        <Card className="border-dashed border-white/15 bg-white/5 p-10 text-center">
          <div className="flex justify-center text-slate-600">
            {isVoice ? <Mic size={48} strokeWidth={1} /> : <PenLine size={48} strokeWidth={1} />}
          </div>
          <p className="mt-4 text-lg font-medium text-white">Your inbox is empty</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Share your public link — the first {noun} will appear here.
          </p>
          <div className="mt-5 flex justify-center">
            <CopyButton value={publicUrl} />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            item.type === "VOICE" ? (
              // ── Voice note card ──
              <Card key={item.id} className="space-y-4 border-white/10 bg-slate-950/65 p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-900/20 p-4">
                  <div className="rounded-full bg-violet-500/20 p-2.5">
                    <Mic size={20} className="text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Voice Note</p>
                    <p className="text-xs text-slate-400">{item.createdAtLabel}</p>
                  </div>
                </div>

                {item.audioUrl && (
                  <VoicePlayer
                    audioUrl={item.audioUrl}
                    preset={item.audioPreset ?? "normal"}
                  />
                )}

                <div className="space-y-2">
                  <p className="min-h-10 text-sm leading-6 text-slate-200">
                    {item.note || "No note added."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletingId === item.id}
                  onClick={() => deleteItem(item.id)}
                >
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </Button>
              </Card>
            ) : (
              // ── Drawing card ──
              <Card key={item.id} className="space-y-4 border-white/10 bg-slate-950/65 p-4">
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setSelected(item)}
                >
                  <div className="relative flex aspect-4/5 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 p-3 transition hover:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl!}
                      alt="Submitted drawing"
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </button>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.createdAtLabel}
                  </p>
                  <p className="min-h-12 text-sm leading-6 text-slate-200">
                    {item.note || "No note added."}
                  </p>
                  <p className="text-xs text-slate-400">Tap or click the preview to open.</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletingId === item.id}
                  onClick={() => deleteItem(item.id)}
                >
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </Button>
              </Card>
            ),
          )}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : `Load more ${noun}s`}
          </Button>
        </div>
      )}

      {/* ── Drawing full-size modal ── */}
      <Modal
        open={selected !== null && selected.type === "DRAWING"}
        onClose={() => setSelected(null)}
        title={selected ? `${displayName}'s saved ${noun}` : undefined}
        contentClassName="max-w-5xl bg-slate-950/95 p-4 sm:p-6"
      >
        {selected?.type === "DRAWING" ? (
          <div className="space-y-4">
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl bg-slate-950 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.imageUrl!}
                alt={`Saved ${Noun} full view`}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {selected.createdAtLabel}
              </p>
              <p className="text-sm leading-6 text-slate-200">
                {selected.note || "No note added."}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}