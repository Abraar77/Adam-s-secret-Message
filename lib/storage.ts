// ---------------------------------------------------------------------------
// Image storage via Supabase Storage (production).
// Falls back to writing to public/dev-images/ when env vars are absent (local dev).
// ---------------------------------------------------------------------------

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "drawings";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;
  supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  return supabase;
}

function isConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadImage(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!isConfigured()) {
    return localDevUpload(key, buffer);
  }

  const sb = getSupabase();
  const { error } = await sb.storage.from(BUCKET).upload(key, buffer, {
    contentType: mimeType,
    upsert: false,
    cacheControl: "31536000", // 1 year — images are immutable
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteImage(imageUrl: string): Promise<void> {
  if (!isConfigured()) {
    await localDevDelete(imageUrl);
    return;
  }

  const key = keyFromPublicUrl(imageUrl);
  if (!key) return; // URL not from our storage — skip silently

  const sb = getSupabase();
  const { error } = await sb.storage.from(BUCKET).remove([key]);
  if (error) {
    // Non-fatal — log but don't throw; the DB row is already gone
    console.error("[storage] delete failed:", error.message);
  }
}

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

// ── Local dev fallback ──────────────────────────────────────────────────────

async function localDevUpload(key: string, buffer: Buffer): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const safeKey = key.replace(/\//g, "-");
  const dir = path.join(process.cwd(), "public", "dev-images");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safeKey), buffer);
  return `/dev-images/${safeKey}`;
}

async function localDevDelete(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith("/dev-images/")) return;
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), "public", imageUrl);
  await fs.unlink(file).catch(() => {});
}
