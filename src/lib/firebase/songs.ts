import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { createId } from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { normalizeSong } from "@/lib/songStorage";
import { buildSongCardSummary } from "@/lib/songSummary";
import { getFirebaseFirestore } from "./client";
import {
  metaFromSong,
  toSongMeta,
  type ContributorInfo,
  type SongCardSummary,
  type SongDocument,
  type SongMeta,
} from "./types";

export type WorkspaceContext = {
  uid: string;
  workspaceId: string;
};

function songsCollection(db: Firestore, workspaceId: string) {
  return collection(db, "workspaces", workspaceId, "songs");
}

function songDocRef(db: Firestore, workspaceId: string, songId: string) {
  return doc(db, "workspaces", workspaceId, "songs", songId);
}

function documentRef(db: Firestore, workspaceId: string, songId: string) {
  return doc(db, "workspaces", workspaceId, "songs", songId, "document", "current");
}

function describeFirestoreError(error: unknown): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "permission-denied") {
    return new Error("You don't have access to this workspace.");
  }
  if (code === "unavailable") {
    return new Error("Cloud storage is temporarily unavailable. Try again shortly.");
  }
  return error instanceof Error ? error : new Error("Cloud storage request failed.");
}

const CARD_SUMMARY_VERSION = 1;

function parseCardSummary(value: unknown): SongCardSummary | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<SongCardSummary>;

  if (candidate.version !== CARD_SUMMARY_VERSION) {
    return undefined;
  }

  const modules = Array.isArray(candidate.modules)
    ? candidate.modules.filter(
        (key): key is SongCardSummary["modules"][number] => typeof key === "string",
      )
    : [];

  const previewRaw =
    candidate.contributors && Array.isArray(candidate.contributors.preview)
      ? candidate.contributors.preview
      : [];
  const preview = previewRaw
    .filter(
      (item): item is NonNullable<SongCardSummary["contributors"]["preview"][number]> =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { uid?: unknown }).uid === "string",
    )
    .map((item) => ({
      uid: item.uid,
      displayName:
        typeof (item as { displayName?: unknown }).displayName === "string"
          ? (item as { displayName: string }).displayName
          : "",
      photoURL:
        typeof (item as { photoURL?: unknown }).photoURL === "string"
          ? (item as { photoURL: string }).photoURL
          : undefined,
    }));

  return {
    version: CARD_SUMMARY_VERSION,
    modules,
    contributors: {
      total:
        candidate.contributors && typeof candidate.contributors.total === "number"
          ? candidate.contributors.total
          : preview.length,
      preview,
    },
  };
}

function parseMeta(id: string, data: Record<string, unknown>): SongMeta | null {
  if (typeof data.title !== "string") {
    return null;
  }

  return {
    id,
    title: data.title,
    artist: typeof data.artist === "string" ? data.artist : undefined,
    key: typeof data.key === "string" ? data.key : undefined,
    tempo: typeof data.tempo === "string" ? data.tempo : undefined,
    mode: data.mode === "advanced" ? "advanced" : "simple",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date(0).toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date(0).toISOString(),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
    schemaVersion: 1,
    cardSummary: parseCardSummary(data.cardSummary),
  };
}

function parseDocument(data: Record<string, unknown>, meta: SongMeta): Song {
  // The stored document shape is { schemaVersion, song, updatedAt, updatedBy }.
  // Legacy/future tolerance: if the payload itself looks like a Song, use it.
  const raw = (data.song ?? data) as Song;

  return {
    ...raw,
    id: meta.id,
    title: meta.title,
    // Timing fields can be missing on very old documents; normalizeSong in
    // songStorage repairs them after this point.
    timingSettings: raw.timingSettings,
    timingByLine: raw.timingByLine ?? {},
  };
}

/** List song metadata for a workspace (one-time read; no realtime listeners). */
export async function listSongs(workspaceId: string): Promise<SongMeta[]> {
  try {
    const db = await getFirebaseFirestore();
    const snapshot = await getDocs(
      query(songsCollection(db, workspaceId), orderBy("updatedAt", "desc")),
    );

    const metas: SongMeta[] = [];
    snapshot.forEach((docSnapshot) => {
      const meta = parseMeta(docSnapshot.id, docSnapshot.data());
      if (meta) {
        metas.push(meta);
      }
    });

    return metas;
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/** Load a single full song document (metadata + body) and return both. */
export async function getSongWithMeta(
  workspaceId: string,
  songId: string,
): Promise<{ meta: SongMeta; song: Song } | null> {
  try {
    const db = await getFirebaseFirestore();
    const [metaSnapshot, documentSnapshot] = await Promise.all([
      getDoc(songDocRef(db, workspaceId, songId)),
      getDoc(documentRef(db, workspaceId, songId)),
    ]);

    if (!metaSnapshot.exists()) {
      return null;
    }

    const meta = parseMeta(metaSnapshot.id, metaSnapshot.data());
    if (!meta) {
      return null;
    }

    if (!documentSnapshot.exists()) {
      // Metadata exists without a body (e.g. interrupted create): treat the
      // song as missing so the editor shows the not-found state.
      return null;
    }

    const song = parseDocument(documentSnapshot.data(), meta);
    return { meta, song };
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/** Convenience wrapper when only the song body is needed. */
export async function getSong(workspaceId: string, songId: string): Promise<Song | null> {
  const result = await getSongWithMeta(workspaceId, songId);
  return result?.song ?? null;
}

/**
 * Create a song in the workspace. Preserves the provided song id (used by the
 * legacy migration to keep local IDs); collisions are the caller's
 * responsibility and are checked with a single read first.
 */
export async function createSong(
  workspaceId: string,
  song: Song,
  uid: string,
  options: { checkCollision?: boolean; contributor?: ContributorInfo } = {},
): Promise<SongMeta> {
  try {
    const db = await getFirebaseFirestore();

    if (options.checkCollision !== false) {
      const existing = await getDoc(songDocRef(db, workspaceId, song.id));
      if (existing.exists()) {
        throw new Error(`A song with id "${song.id}" already exists in this workspace.`);
      }
    }

    const meta = toSongMeta(song, uid, options.contributor);
    const document: SongDocument = {
      schemaVersion: 1,
      song,
      updatedAt: song.updatedAt,
      updatedBy: uid,
    };

    const batch = writeBatch(db);
    batch.set(songDocRef(db, workspaceId, song.id), { ...meta, createdAt: song.createdAt });
    batch.set(documentRef(db, workspaceId, song.id), document);

    await batch.commit();
    return meta;
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/** Save (overwrite) an existing song's metadata + body. */
export async function saveSong(
  workspaceId: string,
  song: Song,
  uid: string,
  existingMeta?: SongMeta | null,
  contributor?: ContributorInfo,
): Promise<SongMeta> {
  try {
    const db = await getFirebaseFirestore();
    const meta = metaFromSong(song, existingMeta ?? null, uid, contributor);
    const document: SongDocument = {
      schemaVersion: 1,
      song,
      updatedAt: song.updatedAt,
      updatedBy: uid,
    };

    const batch = writeBatch(db);
    batch.set(songDocRef(db, workspaceId, song.id), meta);
    batch.set(documentRef(db, workspaceId, song.id), document);

    await batch.commit();
    return meta;
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/** Duplicate a cloud song: reads its body, writes metadata + body under a new id. */
export async function duplicateSong(
  workspaceId: string,
  songId: string,
  uid: string,
): Promise<SongMeta> {
  try {
    const result = await getSongWithMeta(workspaceId, songId);
    if (!result) {
      throw new Error("Song not found.");
    }

    const { song } = result;
    const now = new Date().toISOString();
    const copy: Song = {
      ...song,
      id: createId("song"),
      title: `${song.title || "Untitled Song"} Copy`,
      createdAt: now,
      updatedAt: now,
      // timingByLine references lineIds which are unchanged, so copying the
      // map verbatim keeps advanced-mode timing intact.
    };

    return await createSong(workspaceId, copy, uid, { checkCollision: false });
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/** Delete a song's metadata and body documents. */
export async function deleteSong(workspaceId: string, songId: string): Promise<void> {
  try {
    const db = await getFirebaseFirestore();
    const batch = writeBatch(db);
    batch.delete(songDocRef(db, workspaceId, songId));
    batch.delete(documentRef(db, workspaceId, songId));

    await batch.commit();
  } catch (error) {
    throw describeFirestoreError(error);
  }
}

/**
 * One-time, versioned backfill of card summaries for song metadata that lacks
 * a current-version summary (e.g. songs created before Phase 2.3).
 *
 * Read/write behavior per outdated song: 1 read of document/current, 1 write
 * of the metadata document. Songs already carrying cardSummary.version === 1
 * are skipped with ZERO reads — normal workspace loads never re-read bodies.
 *
 * Concurrency: per-song in-session dedupe so parallel callers (multiple cards
 * mounting, repeated reloads) share one backfill promise per song. A failed
 * backfill leaves the original metadata and body intact and will simply retry
 * on a future session, since detection is "summary missing/outdated".
 */
const backfillInFlight = new Map<string, Promise<SongMeta | null>>();

export function needsSummaryBackfill(meta: SongMeta): boolean {
  return !meta.cardSummary || meta.cardSummary.version !== CARD_SUMMARY_VERSION;
}

export function backfillSongCardSummary(
  workspaceId: string,
  meta: SongMeta,
  contributor: ContributorInfo,
): Promise<SongMeta | null> {
  const key = `${workspaceId}:${meta.id}`;

  const existing = backfillInFlight.get(key);
  if (existing) {
    return existing;
  }

  const run = (async () => {
    try {
      const db = await getFirebaseFirestore();
      const documentSnapshot = await getDoc(documentRef(db, workspaceId, meta.id));

      if (!documentSnapshot.exists()) {
        // Body missing (e.g. interrupted create): leave metadata untouched.
        return meta;
      }

      const song = normalizeSong(parseDocument(documentSnapshot.data(), meta));
      const summary = buildSongCardSummary(song, contributor);

      await setDoc(
        songDocRef(db, workspaceId, meta.id),
        { cardSummary: summary },
        { merge: true },
      );

      return { ...meta, cardSummary: summary };
    } catch (error) {
      // Non-fatal: the card simply renders without module icons until a
      // later session retries (detection is summary-missing).
      console.error(`Could not backfill card summary for song ${meta.id}`, error);
      return meta;
    } finally {
      backfillInFlight.delete(key);
    }
  })();

  backfillInFlight.set(key, run);
  return run;
}
