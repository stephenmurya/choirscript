export function formatTempo(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return /\bbpm\b/i.test(trimmed) ? trimmed : `${trimmed} BPM`;
}
