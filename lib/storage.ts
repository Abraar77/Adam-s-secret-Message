// ---------------------------------------------------------------------------
// File storage via Supabase Storage (production).
// Falls back to writing to public/dev-uploads/ in local dev when env vars
// are absent.  Both images and audio share the same bucket and code path.
// ---------------------------------------------------------------------------

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "drawings";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;
  supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  return supabase;
}

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Generic upload / delete ──────────────────────────────────────────────────

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!isConfigured()) {
    return localDevUpload(key, buffer);
  }

  const sb = getSupabase();
  const { error } = await sb.storage.from(BUCKET).upload(key, buffer, {
    contentType: mimeType,
    upsert: false,
    cacheControl: "31536000", // 1 year — all uploads are immutable
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!isConfigured()) {
    await localDevDelete(fileUrl);
    return;
  }

  const key = keyFromPublicUrl(fileUrl);
  if (!key) return; // not from our storage — skip silently

  const sb = getSupabase();
  const { error } = await sb.storage.from(BUCKET).remove([key]);
  if (error) {
    // Non-fatal — the DB row is already gone; log and move on.
    console.error("[storage] delete failed:", error.message);
  }
}

// ── Named aliases kept for call-site readability ─────────────────────────────

export const uploadImage = uploadFile;
export const deleteImage = deleteFile;
export const uploadAudio = uploadFile;
export const deleteAudio = deleteFile;

// ── Helpers ──────────────────────────────────────────────────────────────────

function keyFromPublicUrl(url: string): string | null {
  try {
    // Supabase public URL format:
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<key>
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  } catch {
    return null;
  }
}

// ── Local dev fallback ───────────────────────────────────────────────────────

async function localDevUpload(key: string, buffer: Buffer): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const safeKey = key.replace(/\//g, "-");
  const dir = path.join(process.cwd(), "public", "dev-uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safeKey), buffer);
  return `/dev-uploads/${safeKey}`;
}

async function localDevDelete(fileUrl: string): Promise<void> {
  if (!fileUrl.startsWith("/dev-uploads/")) return;
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), "public", fileUrl);
  await fs.unlink(file).catch(() => {});
}