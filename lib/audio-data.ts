// Mirrors lib/data-url.ts but for audio blobs sent as base64 data URLs.

// We accept any audio/* MIME type that browsers commonly produce via MediaRecorder.
const SUPPORTED_BASE_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

export type ParsedAudioDataUrl = {
  mimeType: string; // full MIME (may include codec params, e.g. "audio/webm;codecs=opus")
  buffer: Buffer;
};

export function parseAudioDataUrl(value: string): ParsedAudioDataUrl {
  // Strip whitespace — FileReader can inject newlines into long base64 strings
  const cleaned = value.replace(/\s/g, "");

  // MIME allows spaces in codec params e.g. "audio/webm; codecs=opus"
  const match = cleaned.match(
    /^data:(audio\/[^;,]+(?:;[^,]*)?);base64,([A-Za-z0-9+/=]+)$/i,
  );
  if (!match) {
    throw new Error("Audio format is invalid.");
  }

  const mimeType = match[1].toLowerCase().trim();
  const baseType = mimeType.split(";")[0].trim();

  if (!SUPPORTED_BASE_TYPES.has(baseType)) {
    throw new Error("Unsupported audio format. Please use a modern browser.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw new Error("Audio content is empty.");
  }

  return { mimeType, buffer };
}