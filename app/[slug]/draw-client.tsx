"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CanvasBoard, CanvasBoardHandle } from "@/components/draw/canvas-board";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  slug: string;
  displayName: string;
}

export default function DrawClient({ slug, displayName }: Props) {
  const canvasRef = useRef<CanvasBoardHandle>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const submit = async () => {
    const imageData = canvasRef.current?.exportImage();
    if (!imageData) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/profiles/${slug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, note: note || undefined }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to submit");

      setNote("");
      setBoardKey((k) => k + 1);
      setSubmitted(true);

      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 } });
      });

      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <CanvasBoard key={boardKey} ref={canvasRef} />

      <div>
        <p className="text-sm text-slate-300">Anonymous note (optional)</p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={240}
          placeholder="Leave a short note with your drawing."
          className="mt-2"
        />
      </div>

      <Button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="w-full md:w-auto"
      >
        {submitting ? "Sending..." : "Send drawing"}
      </Button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="rounded-2xl border border-emerald-400/30 bg-emerald-900/25 p-4"
          >
            <p className="text-sm font-medium text-emerald-300">
              Drawing sent to {displayName}&apos;s private inbox!
            </p>
            <p className="mt-1 text-xs text-emerald-400/70">
              They&apos;ll see it when they open their inbox. Draw another one!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
