import { headers } from "next/headers";

export async function getRequestIp() {
  const hdrs = await headers();
  const candidates = [
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim(),
    hdrs.get("x-real-ip")?.trim(),
    hdrs.get("cf-connecting-ip")?.trim(),
    hdrs.get("x-vercel-forwarded-for")?.split(",")[0]?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate.slice(0, 120);
    }
  }

  return "unknown";
}
