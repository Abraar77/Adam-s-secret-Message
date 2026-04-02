const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export type ParsedImageDataUrl = {
  mimeType: string;
  buffer: Buffer;
};

export function parseImageDataUrl(value: string): ParsedImageDataUrl {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("Drawing format is invalid.");
  }

  const mimeType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Only PNG, JPEG, and WebP drawings are supported.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw new Error("Drawing content is empty.");
  }

  return {
    mimeType,
    buffer,
  };
}
