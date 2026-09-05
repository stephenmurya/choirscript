import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { createId } from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { getFirebaseFirestore } from "./client";
import {
  metaFromSong,
  toSongMeta,
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
  options: { checkCollision?: boolean } = {},
): Promise<SongMeta> {
  try {
    const db = await getFirebaseFirestore();

    if (options.checkCollision !== false) {
      const existing = await getDoc(songDocRef(db, workspaceId, song.id));
      if (existing.exists()) {
        throw new Error(`A song with id "${song.id}" already exists in this workspace.`);
      }
    }

    const meta = toSongMeta(song, uid);
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
): Promise<SongMeta> {
  try {
    const db = await getFirebaseFirestore();
    const meta = metaFromSong(song, existingMeta ?? null, uid);
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
