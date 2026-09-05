import { createId, normalizeSong } from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { createSong, listSongs } from "./songs";

const LEGACY_STORAGE_KEY = "choirscript.songs.v1";
const MIGRATION_COMPLETE_PREFIX = "choirscript.migration.complete.";
const MIGRATION_PROGRESS_KEY = "choirscript.migration.progress.v1";

export type MigrationResult = {
  status: "migrated" | "nothing-to-migrate" | "failed";
  imported: number;
  skipped: number;
  renamedCollisions: number;
  failedImports: string[];
  error?: string;
};

/**
 * Fingerprint of the legacy source content. Progress is only trusted while it
 * matches, so re-seeded/changed legacy data starts a fresh migration instead
 * of silently skipping songs.
 */
function contentFingerprint(raw: string): string {
  // djb2 — deterministic, browser-local, not used for anything security-sensitive.
  let hash = 5381;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(index)) | 0;
  }

  return `${raw.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

type MigrationProgress = {
  version: 1;
  sourceFingerprint: string;
  /** legacy song id -> resulting cloud song id (confirmed persisted) */
  entries: Record<string, string>;
};

function createEmptyProgress(sourceFingerprint: string): MigrationProgress {
  return { version: 1, sourceFingerprint, entries: {} };
}

/**
 * Load browser-local migration progress. Defensive against malformed
 * localStorage content: any structural mismatch is treated as "no progress"
 * rather than throwing or corrupting the run.
 */
function loadProgress(sourceFingerprint: string): MigrationProgress {
  if (typeof window === "undefined") {
    return createEmptyProgress(sourceFingerprint);
  }

  try {
    const raw = window.localStorage.getItem(MIGRATION_PROGRESS_KEY);
    if (!raw) {
      return createEmptyProgress(sourceFingerprint);
    }

    const parsed = JSON.parse(raw) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1 ||
      typeof (parsed as { sourceFingerprint?: unknown }).sourceFingerprint !== "string"
    ) {
      return createEmptyProgress(sourceFingerprint);
    }

    const progress = parsed as Partial<MigrationProgress>;
    const entries: Record<string, string> = {};

    if (progress.entries && typeof progress.entries === "object") {
      Object.entries(progress.entries).forEach(([key, value]) => {
        if (typeof key === "string" && key && typeof value === "string" && value) {
          entries[key] = value;
        }
      });
    }

    if (progress.sourceFingerprint !== sourceFingerprint) {
      // Legacy source changed since this progress was written: start fresh.
      return createEmptyProgress(sourceFingerprint);
    }

    return { version: 1, sourceFingerprint, entries };
  } catch (error) {
    console.error("Could not parse migration progress; starting fresh", error);
    return createEmptyProgress(sourceFingerprint);
  }
}

function saveProgress(progress: MigrationProgress) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MIGRATION_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Could not persist migration progress", error);
  }
}

function clearProgress() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(MIGRATION_PROGRESS_KEY);
  } catch (error) {
    console.error("Could not clear migration progress", error);
  }
}

/**
 * Read the raw legacy songs JSON without any side effects.
 *
 * IMPORTANT: deliberately does NOT call loadSongs() — that function seeds the
 * demo song when storage is empty, which would fabricate data to migrate.
 */
export function readLegacySongsRaw(): { raw: string; songs: Song[] } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return { raw, songs: [] };
    }

    const songs = parsed
      .filter((entry): entry is Song => Boolean(entry) && typeof entry === "object")
      .map((song) => normalizeSong(song as Song));

    return { raw, songs };
  } catch (error) {
    console.error("Could not parse legacy ChoirScript storage", error);
    // Corrupt legacy data: treat as unparseable rather than losing it.
    throw new Error("Your local song data could not be read. It has been left untouched.");
  }
}

/**
 * True when the active legacy key still holds data that needs migrating.
 * Used by the migration gate to distinguish "checking" from "migrating".
 */
export function hasLegacyData(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (raw === null) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    // Unparseable content still counts as data requiring attention — the run
    // will surface the failure and leave the source untouched.
    return true;
  }
}

function backupLegacyStorage(raw: string) {
  const backupKey = `${LEGACY_STORAGE_KEY}.backup.${Date.now()}`;
  window.localStorage.setItem(backupKey, raw);
  return backupKey;
}

function markMigrationComplete(imported: number) {
  window.localStorage.setItem(
    `${MIGRATION_COMPLETE_PREFIX}${LEGACY_STORAGE_KEY}`,
    JSON.stringify({ completedAt: new Date().toISOString(), imported }),
  );
}

// ---------------------------------------------------------------------------
// Single-flight orchestration: ensures at most one migration run executes per
// browser session even if multiple components mount simultaneously.
// ---------------------------------------------------------------------------

let activeRun: Promise<MigrationResult> | null = null;
let activeRunKey = "";

export function runLegacyMigrationOnce(
  workspaceId: string,
  uid: string,
): Promise<MigrationResult> {
  const key = `${workspaceId}:${uid}`;

  if (activeRun && activeRunKey === key) {
    return activeRun;
  }

  activeRunKey = key;
  activeRun = migrateLegacySongs(workspaceId, uid).finally(() => {
    activeRun = null;
    activeRunKey = "";
  });

  return activeRun;
}

/**
 * One-time, browser-local migration of legacy localStorage songs into the
 * signed-in user's default workspace.
 *
 * Guarantees:
 * - Legacy data is only removed from the active key AFTER every cloud write
 *   has succeeded, and a timestamped backup is written first.
 * - Never silently overwrites a cloud song: ID collisions on FIRST import are
 *   imported under a fresh ID with " (Imported copy)" appended to the title.
 * - Retry-safe: each song confirmed persisted to Firestore is recorded in
 *   browser-local progress (legacy id -> cloud id) and skipped on retry, so
 *   partial failures never produce duplicates.
 * - Per-song failures don't abort the run; failed/unattempted songs stay
 *   retryable and the legacy source remains untouched.
 * - No global "migration complete" flag: all state is per-browser, so users
 *   can migrate from other devices later.
 */
async function migrateLegacySongs(
  workspaceId: string,
  uid: string,
): Promise<MigrationResult> {
  let legacy: { raw: string; songs: Song[] } | null;

  try {
    legacy = readLegacySongsRaw();
  } catch (error) {
    return {
      status: "failed",
      imported: 0,
      skipped: 0,
      renamedCollisions: 0,
      failedImports: [],
      error: error instanceof Error ? error.message : "Could not read legacy data.",
    };
  }

  if (legacy === null) {
    return { status: "nothing-to-migrate", imported: 0, skipped: 0, renamedCollisions: 0, failedImports: [] };
  }

  const { raw, songs: legacySongs } = legacy;

  if (legacySongs.length === 0) {
    // Empty array: nothing of value. Back up and clear the key.
    backupLegacyStorage(raw);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    markMigrationComplete(0);
    return { status: "migrated", imported: 0, skipped: 0, renamedCollisions: 0, failedImports: [] };
  }

  const sourceFingerprint = contentFingerprint(raw);
  const progress = loadProgress(sourceFingerprint);

  const pendingSongs = legacySongs.filter((song) => !progress.entries[song.id]);
  const skipped = legacySongs.length - pendingSongs.length;

  if (pendingSongs.length === 0) {
    // Everything in this legacy source is already confirmed migrated.
    backupLegacyStorage(raw);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    markMigrationComplete(skipped);
    clearProgress();
    return { status: "migrated", imported: 0, skipped, renamedCollisions: 0, failedImports: [] };
  }

  let existingIds = new Set<string>();

  try {
    const cloudSongs = await listSongs(workspaceId);
    existingIds = new Set(cloudSongs.map((meta) => meta.id));
  } catch (error) {
    return {
      status: "failed",
      imported: 0,
      skipped,
      renamedCollisions: 0,
      failedImports: [],
      error: error instanceof Error ? error.message : "Could not check existing cloud songs.",
    };
  }

  const failedImports: string[] = [];
  let imported = 0;
  let renamedCollisions = 0;

  for (const song of pendingSongs) {
    try {
      const isCollision = existingIds.has(song.id);
      const importSong: Song = isCollision
        ? {
            ...song,
            id: createId("song"),
            title: `${song.title || "Untitled Song"} (Imported copy)`,
          }
        : song;

      if (isCollision) {
        renamedCollisions += 1;
      }

      await createSong(workspaceId, importSong, uid, {
        // Collision was resolved above by renaming; skip the pre-read.
        checkCollision: false,
      });

      // Confirm before advancing: record progress only after the cloud write
      // committed, so a crash/failure mid-run never loses or duplicates work.
      progress.entries[song.id] = importSong.id;
      saveProgress(progress);
      existingIds.add(importSong.id);
      imported += 1;
    } catch (error) {
      console.error(`Failed to migrate song "${song.title}" (${song.id})`, error);
      failedImports.push(song.title || song.id);
    }
  }

  if (failedImports.length > 0) {
    // Partial failure: keep the legacy key and progress intact so the user
    // can retry. Already-confirmed songs are skipped on retry.
    return {
      status: "failed",
      imported,
      skipped,
      renamedCollisions,
      failedImports,
      error: `${failedImports.length} song(s) could not be imported. Your local data is untouched.`,
    };
  }

  // All cloud writes succeeded: back up, then retire the active key.
  backupLegacyStorage(raw);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  markMigrationComplete(imported + skipped);
  clearProgress();

  return { status: "migrated", imported, skipped, renamedCollisions, failedImports: [] };
}
