"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  connectEffect,
  getSupportedAudioMimeType,
  VOICE_PRESETS,
  type VoicePreset,
} from "@/lib/voice-effects";
import { Mic, MicOff, Play, Square, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "requesting" | "recording" | "recorded" | "submitting" | "submitted";

const MAX_RECORDING_SECONDS = 25;

interface Props {
  slug: string;
  displayName: string;
}

export default function VoiceClient({ slug, displayName }: Props) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [preset, setPreset]       = useState<VoicePreset>("normal");
  const [note, setNote]           = useState("");
  const [elapsed, setElapsed]     = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const audioBlobRef   = useRef<Blob | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPreviewRef = useRef<(() => void) | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      stopPreviewRef.current?.();
      audioCtxRef.current?.close();
    };
  }, []);

  // Auto-stop recording at max duration
  useEffect(() => {
    if (phase !== "recording") return;
    if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase]);

  const startRecording = async () => {
    setError(null);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        audioBlobRef.current = blob;
        setPhase("recorded");
      };

      recorder.start(100);
      recorderRef.current = recorder;

      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : "Could not start recording. Please check your microphone.",
      );
    }
  };

  const stopRecording = () => {
    timerRef.current && clearInterval(timerRef.current);
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const resetRecording = () => {
    stopPreviewRef.current?.();
    stopPreviewRef.current = null;
    setPreviewing(false);
    audioBlobRef.current = null;
    setElapsed(0);
    setNote("");
    setError(null);
    setPhase("idle");
  };

  const previewAudio = async () => {
    const blob = audioBlobRef.current;
    if (!blob) return;

    if (previewing) {
      stopPreviewRef.current?.();
      stopPreviewRef.current = null;
      setPreviewing(false);
      return;
    }

    setError(null);
    try {
      // Close any existing context to avoid accumulating them
      await audioCtxRef.current?.close();
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const arrayBuffer = await blob.arrayBuffer();
      const source = ctx.createBufferSource();
      source.buffer = await ctx.decodeAudioData(arrayBuffer);
      const cleanup = connectEffect(ctx, source, preset, ctx.destination);

      source.onended = () => {
        cleanup();
        ctx.close();
        setPreviewing(false);
        stopPreviewRef.current = null;
      };

      source.start(0);
      setPreviewing(true);
      stopPreviewRef.current = () => {
        try { source.stop(); } catch { /* already ended */ }
        cleanup();
        ctx.close();
      };
    } catch (err) {
      console.error("Preview failed:", err);
      setError("Could not play preview. Try a different browser.");
      setPreviewing(false);
    }
  };

  const submit = async () => {
    const blob = audioBlobRef.current;
    if (!blob) return;

    stopPreviewRef.current?.();
    stopPreviewRef.current = null;
    setPreviewing(false);

    setError(null);
    setPhase("submitting");

    try {
      // Encode blob as base64 data URL
      const audioData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read audio file."));
        reader.readAsDataURL(blob);
      });

      const res = await fetch(`/api/profiles/${slug}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData, preset, note: note || undefined }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to submit voice note.");

      setNote("");
      setPhase("submitted");
      audioBlobRef.current = null;

      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 } });
      });

      setTimeout(() => {
        setPhase("idle");
        setElapsed(0);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit voice note.");
      setPhase("recorded");
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Recording controls ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-full border border-white/10 bg-white/5 p-5">
              <Mic size={32} className="text-sky-300" />
            </div>
            <p className="text-slate-300">Tap to start recording</p>
            <Button type="button" onClick={startRecording} size="lg">
              Start recording
            </Button>
          </div>
        )}

        {phase === "requesting" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-sm text-slate-400">Waiting for microphone permission…</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative flex items-center justify-center">
              <span className="absolute h-16 w-16 animate-ping rounded-full bg-rose-500/30" />
              <div className="relative rounded-full bg-rose-500/20 p-4">
                <Mic size={28} className="text-rose-400" />
              </div>
            </div>
            <p className="tabular-nums text-2xl font-semibold text-white">
              {formatTime(elapsed)}
              <span className="ml-2 text-sm font-normal text-slate-400">
                / {formatTime(MAX_RECORDING_SECONDS)}
              </span>
            </p>
            <Button type="button" variant="outline" onClick={stopRecording} size="lg" className="border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
              <Square size={14} className="mr-1.5" /> Stop recording
            </Button>
          </div>
        )}

        {(phase === "recorded" || phase === "submitting") && (
          <div className="space-y-5">
            {/* Duration badge */}
            <div className="flex items-center gap-2">
              <MicOff size={15} className="text-slate-400" />
              <span className="text-sm text-slate-300">
                Recording ready · {formatTime(elapsed)}
              </span>
            </div>

            {/* Effect selector */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                Voice effect
              </p>
              <div className="flex flex-wrap gap-2">
                {VOICE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={phase === "submitting"}
                    onClick={() => {
                      stopPreviewRef.current?.();
                      stopPreviewRef.current = null;
                      setPreviewing(false);
                      setPreset(p.id);
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition",
                      preset === p.id
                        ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview + actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={phase === "submitting"}
                onClick={previewAudio}
              >
                {previewing ? (
                  <><Square size={13} className="mr-1.5" /> Stop preview</>
                ) : (
                  <><Play size={13} className="mr-1.5" /> Preview</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={phase === "submitting"}
                onClick={resetRecording}
              >
                <RotateCcw size={13} className="mr-1.5" /> Re-record
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Note field (shown once recorded) ── */}
      {(phase === "recorded" || phase === "submitting") && (
        <div>
          <p className="text-sm text-slate-300">Anonymous note (optional)</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Add a short anonymous note with your voice note."
            className="mt-2"
            disabled={phase === "submitting"}
          />
        </div>
      )}

      {/* ── Submit button ── */}
      {(phase === "recorded" || phase === "submitting") && (
        <Button
          type="button"
          disabled={phase === "submitting"}
          onClick={submit}
          className="w-full md:w-auto"
        >
          {phase === "submitting" ? "Sending…" : "Send voice note"}
        </Button>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {/* ── Success banner ── */}
      <AnimatePresence>
        {phase === "submitted" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="rounded-2xl border border-emerald-400/30 bg-emerald-900/25 p-4"
          >
            <p className="text-sm font-medium text-emerald-300">
              Voice note sent to {displayName}&apos;s private inbox!
            </p>
            <p className="mt-1 text-xs text-emerald-400/70">
              They&apos;ll hear it when they open their inbox. Send another one!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}