import type { Song } from "./songTypes";

/**
 * Undo/redo history for the song editor.
 *
 * Snapshots the whole Song document. That is cheap next to the document size
 * (songs are lyric sheets, not media), and it keeps every mutation path — text,
 * timing, parts, arrangement — undoable without each one having to describe its
 * own inverse.
 *
 * Pure and clock-injectable so the behaviour can be tested without React.
 */

/** Edits closer together than this collapse into a single undo step. */
export const HISTORY_COALESCE_MS = 500;
export const HISTORY_LIMIT = 60;

export type EditorHistory = {
  past: Song[];
  future: Song[];
  /** Timestamp of the last recorded snapshot, for burst coalescing. */
  lastRecordedAt: number;
};

export function createHistory(): EditorHistory {
  return { past: [], future: [], lastRecordedAt: 0 };
}

/**
 * Record `previous` as an undo point.
 *
 * A burst of edits (typing) must not produce one undo step per keypress, so
 * anything within HISTORY_COALESCE_MS of the last snapshot reuses it: the entry
 * already holds the state from before the burst started.
 */
export function pushHistoryEntry(
  history: EditorHistory,
  previous: Song,
  now: number = Date.now(),
): EditorHistory {
  if (now - history.lastRecordedAt > HISTORY_COALESCE_MS) {
    history.past.push(previous);

    if (history.past.length > HISTORY_LIMIT) {
      history.past.shift();
    }

    history.future.length = 0;
  }

  history.lastRecordedAt = now;
  return history;
}

/** Pop the previous document and stash `current` for redo. Null when empty. */
export function takeUndo(history: EditorHistory, current: Song | null): Song | null {
  const previous = history.past.pop();

  if (!previous) {
    return null;
  }

  if (current) {
    history.future.push(current);
  }

  // The next edit after an undo starts a fresh undo step.
  history.lastRecordedAt = 0;
  return previous;
}

/** Pop the next document and stash `current` for undo. Null when empty. */
export function takeRedo(history: EditorHistory, current: Song | null): Song | null {
  const next = history.future.pop();

  if (!next) {
    return null;
  }

  if (current) {
    history.past.push(current);
  }

  history.lastRecordedAt = 0;
  return next;
}

export function historyCounts(history: EditorHistory): { undo: number; redo: number } {
  return { undo: history.past.length, redo: history.future.length };
}
