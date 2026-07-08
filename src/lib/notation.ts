export const NOTE_VALUES = ["Do", "Re", "Mi", "Fa", "So", "Ze", "La", "Ti"] as const;

export const NOTE_ALIASES: Record<string, (typeof NOTE_VALUES)[number]> = {
  d: "Do",
  r: "Re",
  m: "Mi",
  f: "Fa",
  s: "So",
  z: "Ze",
  l: "La",
  t: "Ti",
};

export function normalizeNoteInput(key: string): string | null {
  if (key.length !== 1) {
    return null;
  }

  return NOTE_ALIASES[key.toLowerCase()] ?? null;
}

export function isAllowedNote(note: string): boolean {
  return NOTE_VALUES.some((value) => value.toLowerCase() === note.trim().toLowerCase());
}
