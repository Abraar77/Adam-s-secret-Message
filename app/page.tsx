"use client";

import { useState } from "react";
import { SignupPanel } from "@/components/signup-panel";
import { Mic, PenLine, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "DRAWING" | "VOICE" | null;

export default function Home() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 sm:px-10 lg:py-16">
      {mode === null ? (
        <div className="space-y-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Secret Sketch</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
              What do you want to receive?
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-400">
              Choose your inbox type. Share one public link. Everything stays private.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {/* Drawing option */}
            <button
              type="button"
              onClick={() => setMode("DRAWING")}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-3xl border border-white/10",
                "bg-slate-950/60 p-8 text-left transition",
                "hover:border-sky-400/40 hover:bg-sky-950/30",
              )}
            >
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 transition group-hover:bg-sky-500/20">
                <PenLine size={28} className="text-sky-300" />
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Secret Drawing</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Friends visit your link and draw you something anonymously. You keep
                  every sketch in a private inbox only you can open.
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 transition group-hover:gap-2.5">
                Get started →
              </span>
            </button>

            {/* Voice note option */}
            <button
              type="button"
              onClick={() => setMode("VOICE")}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-3xl border border-white/10",
                "bg-slate-950/60 p-8 text-left transition",
                "hover:border-violet-400/40 hover:bg-violet-950/30",
              )}
            >
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 transition group-hover:bg-violet-500/20">
                <Mic size={28} className="text-violet-300" />
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Secret Voice Note</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Friends record a voice note and pick a fun effect — Deep, Chipmunk,
                  Robot, or Telephone. You hear them all in a private inbox.
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition group-hover:gap-2.5">
                Get started →
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <SignupPanel profileType={mode} />
        </div>
      )}
    </main>
  );
}