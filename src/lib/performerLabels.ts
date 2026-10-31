"use client";

/**
 * Performer label suggestions ("Lead", "Backups", "Singer 1", a name).
 *
 * The arrangement stays open-ended: any text is a valid performer. This module
 * only remembers what the user has already typed so the same label can be
 * picked from a dropdown elsewhere instead of being retyped.
 *
 * Storage is browser-local (localStorage) for now, matching the syllable
 * dictionary. The backend is expected to move off Vercel/Firebase, at which
 * point these lists become workspace-scoped documents and this module is the
 * single seam that has to change.
 */

const STORAGE_KEY = "choirscript.performerLabels.v1";
const MAX_LABELS = 40;
const MAX_LABEL_LENGTH = 40;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_LABEL_LENGTH);
}

function readLabels(): string[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map(normalizeLabel)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeLabels(labels: string[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(labels.slice(0, MAX_LABELS)));
  } catch {
    // Storage can be full or blocked; suggestions are a convenience, not data.
  }
}

/**
 * Suggestions for the picker: labels already used in this song first (they are
 * the most relevant), then labels remembered from earlier sessions.
 */
export function getPerformerSuggestions(usedInSong: string[] = []): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of [...usedInSong, ...readLabels()]) {
    const label = normalizeLabel(value);

    if (!label) {
      continue;
    }

    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(label);
  }

  return ordered;
}

/** Remember a label so it shows up in future suggestion lists. */
export function rememberPerformerLabel(value: string): void {
  const label = normalizeLabel(value);

  if (!label) {
    return;
  }

  const existing = readLabels().filter((entry) => entry.toLowerCase() !== label.toLowerCase());
  writeLabels([label, ...existing]);
}

/** Drop a remembered label (used by the "forget" affordance). */
export function forgetPerformerLabel(value: string): void {
  const key = normalizeLabel(value).toLowerCase();

  if (!key) {
    return;
  }

  writeLabels(readLabels().filter((entry) => entry.toLowerCase() !== key));
}
