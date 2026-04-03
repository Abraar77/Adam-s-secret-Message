"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SignupResult = {
  profile: {
    displayName: string;
    slug: string;
  };
  publicUrl: string;
  ownerUrl: string;
};

const STORAGE_KEY = "draw-me:last-owner-link";

export function SignupPanel() {
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [savedOwnerUrl, setSavedOwnerUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedOwnerUrl(stored);
      }
    } catch (storageError) {
      console.error(storageError);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });
      

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server error (${response.status}). Please try again.`);
      }
      const json = (await response.json()) as SignupResult & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to create your links.");
      }

      setResult(json);
      setDisplayName("");
      setSavedOwnerUrl(json.ownerUrl);
      window.localStorage.setItem(STORAGE_KEY, json.ownerUrl);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to create your links.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeOwnerUrl = result?.ownerUrl ?? savedOwnerUrl;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-white/15 bg-slate-950/60 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-sky-300">
            Private Drawing Inbox
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Type your name. Get one public link. Keep every drawing private.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Friends open your public page, sketch something for you, and send an
            optional anonymous note. Only your private owner link can open the
            saved inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="displayName" className="text-sm text-slate-200">
              Your name
            </label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Adam"
              className="mt-2 h-12 bg-white/5 text-base"
              maxLength={60}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Creating links..." : "Sign up and generate links"}
          </Button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </form>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-200">1. Sign up</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter only your name. No public profile setup.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-200">2. Share the public link</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Friends can draw and leave an optional anonymous note.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-200">3. Open your inbox</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Only the private owner link can view or delete submissions.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-sky-400/20 bg-slate-950/70 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sky-200">
              Your Links
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {result ? result.profile.displayName : "Ready after signup"}
            </h2>
          </div>
          {activeOwnerUrl ? (
            <a
              href={activeOwnerUrl}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
            >
              Open last inbox
            </a>
          ) : null}
        </div>

        {result ? (
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Public share link</p>
              <code className="block overflow-x-auto rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-sky-100">
                {result.publicUrl}
              </code>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={result.publicUrl} />
                <a
                  href={result.publicUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/5"
                >
                  Open public page
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">Private owner link</p>
                <span className="text-xs uppercase tracking-[0.2em] text-amber-200">
                  Keep secret
                </span>
              </div>
              <code className="block overflow-x-auto rounded-2xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
                {result.ownerUrl}
              </code>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={result.ownerUrl} />
                <a
                  href={result.ownerUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/5"
                >
                  Open inbox
                </a>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                This browser remembers the last private owner link so you can
                reopen it later.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm leading-7 text-slate-400">
            Create your link once, then copy the public link for friends and
            keep the private owner link for yourself.
          </div>
        )}
      </Card>
    </div>
  );
}
