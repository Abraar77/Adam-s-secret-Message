const bannedWords = ["http://", "https://", "sex", "spam", "scam", "viagra"];

export function isSpamText(value?: string) {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (bannedWords.some((w) => lower.includes(w))) return true;
  if (value.length > 240) return true;
  const repeated = /(.)\1{6,}/;
  if (repeated.test(value)) return true;
  return false;
}
