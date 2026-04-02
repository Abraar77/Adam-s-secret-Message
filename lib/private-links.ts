import { createHash, randomBytes } from "crypto";

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function slugifyDisplayName(displayName: string) {
  const base = normalizeDisplayName(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "artist";
}

export function withSlugSuffix(baseSlug: string) {
  return `${baseSlug}-${randomBytes(2).toString("hex")}`;
}

export function createOwnerToken() {
  return randomBytes(24).toString("hex");
}

export function hashOwnerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRequestOrigin(url: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(url).origin;
}
