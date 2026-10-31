import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { get, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { SharedSongPayload, SharedSongRevision, Song } from "./songTypes";
import { normalizeSong } from "./songStorage";

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;

/**
 * Development-safe diagnostic: which credential model the Blob SDK will
 * resolve in this environment. Values only — never prints token contents.
 */
function logBlobAuthMode() {
  const hasReadWrite = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidc = Boolean(process.env.VERCEL_OIDC_TOKEN);
  const hasStoreId = Boolean(process.env.BLOB_STORE_ID);

  const mode = hasReadWrite
    ? "read-write-token (BLOB_READ_WRITE_TOKEN)"
    : hasOidc && hasStoreId
      ? "oidc (VERCEL_OIDC_TOKEN + BLOB_STORE_ID)"
      : hasOidc
        ? "oidc-token-only (MISSING BLOB_STORE_ID — SDK will fall through to token lookup and fail)"
        : "none";

  console.log(
    `[share] Blob auth mode: ${mode} | BLOB_READ_WRITE_TOKEN=${hasReadWrite} VERCEL_OIDC_TOKEN=${hasOidc} BLOB_STORE_ID=${hasStoreId}`,
  );
}

function sharePathname(shareId: string) {
  return `shares/${shareId}.json`;
}

function shareRevisionPathname(shareId: string) {
  return `shares/${shareId}.rev.json`;
}

function shareTokenPathname(shareId: string) {
  return `shares/${shareId}.key.json`;
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream);
  return response.text();
}

export function validateShareId(shareId: string) {
  return SHARE_ID_PATTERN.test(shareId);
}

export async function createSharedSong(
  song: Song,
): Promise<{ shareId: string; editToken: string; revision: number; url: string }> {
  logBlobAuthMode();

  const shareId = nanoid(10);
  const editToken = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  const revision = 1;
  const payload = buildPayload({ shareId, revision, createdAt: now, updatedAt: now, song });

  await Promise.all([
    put(sharePathname(shareId), JSON.stringify(payload), {
      access: "private",
      // Mutable from the start: the link is a moving head, republished on save.
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    }),
    writeRevision(shareId, revision, now),
  ]);

  // The token lives inside the payload so a later publish can prove ownership
  // without an account: whoever created the link is the only one who can
  // overwrite it.
  await putShareToken(shareId, editToken);

  return {
    shareId,
    editToken,
    revision,
    url: `/s/${shareId}`,
  };
}

/**
 * Republish an existing link. Returns the new revision so the editor can keep
 * its local copy in sync and viewers can detect the change.
 */
export async function publishSharedSong(
  shareId: string,
  editToken: string,
  song: Song,
): Promise<{ revision: number; updatedAt: string } | "forbidden" | "missing"> {
  if (!validateShareId(shareId) || !editToken) {
    return "missing";
  }

  const existing = await readShareHead(shareId);

  if (!existing) {
    return "missing";
  }

  const storedToken = await readShareToken(shareId);

  if (!storedToken || storedToken !== editToken) {
    return "forbidden";
  }

  const now = new Date().toISOString();
  const revision = (existing.revision ?? 0) + 1;
  const payload = buildPayload({
    shareId,
    revision,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
    song,
  });

  await put(sharePathname(shareId), JSON.stringify(payload), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });

  await writeRevision(shareId, revision, now);

  return { revision, updatedAt: now };
}

/** Cheap poll target: a few dozen bytes instead of the whole song. */
export async function getSharedRevision(shareId: string): Promise<SharedSongRevision | null> {
  if (!validateShareId(shareId)) {
    return null;
  }

  try {
    const result = await get(shareRevisionPathname(shareId), {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const parsed = JSON.parse(await streamToText(result.stream)) as SharedSongRevision;

    if (typeof parsed.revision !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildPayload({
  shareId,
  revision,
  createdAt,
  updatedAt,
  song,
}: {
  shareId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  song: Song;
}): SharedSongPayload {
  return {
    schemaVersion: 2,
    shareId,
    createdAt,
    updatedAt,
    revision,
    title: song.title,
    artist: song.artist,
    key: song.key,
    bpm: song.tempo,
    song: {
      // The link is public; the edit token must never leave the owner's copy.
      ...normalizeSong({ ...song, share: undefined }),
      updatedAt: song.updatedAt || updatedAt,
      createdAt: song.createdAt || createdAt,
    },
  };
}

async function writeRevision(shareId: string, revision: number, updatedAt: string) {
  await put(
    shareRevisionPathname(shareId),
    JSON.stringify({ revision, updatedAt } satisfies SharedSongRevision),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    },
  );
}

async function readShareHead(shareId: string): Promise<SharedSongPayload | null> {
  try {
    const result = await get(sharePathname(shareId), { access: "private", useCache: false });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    return JSON.parse(await streamToText(result.stream)) as SharedSongPayload;
  } catch {
    return null;
  }
}

async function putShareToken(shareId: string, editToken: string) {
  await put(shareTokenPathname(shareId), JSON.stringify({ editToken }), {
    access: "private",
    // Public blobs are readable by URL, so the token gets its own path that is
    // never linked from anywhere: only a publish request can reveal it.
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

async function readShareToken(shareId: string): Promise<string | null> {
  try {
    const result = await get(shareTokenPathname(shareId), { access: "private", useCache: false });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const parsed = JSON.parse(await streamToText(result.stream)) as { editToken?: string };
    return typeof parsed.editToken === "string" ? parsed.editToken : null;
  } catch {
    return null;
  }
}

/**
 * Request-scoped shared-payload fetch. generateMetadata() and the page
 * component both need the payload for a shared link; React's cache() dedupes
 * the (stream-consuming) Blob GET within a single server request so the body
 * is fetched once.
 *
 * useCache is off: a share is a moving head now, so a cached copy would serve
 * the previous revision to viewers for the length of the CDN TTL.
 */
export const getSharedSong = cache(async (shareId: string): Promise<SharedSongPayload | null> => {
  if (!validateShareId(shareId)) {
    return null;
  }

  try {
    const result = await get(sharePathname(shareId), {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text) as SharedSongPayload;

    if (![1, 2].includes(parsed.schemaVersion) || parsed.shareId !== shareId || !parsed.song) {
      return null;
    }

    return {
      ...parsed,
      schemaVersion: 2,
      // Links created before live shares have no counter; they are revision 1.
      revision: typeof parsed.revision === "number" ? parsed.revision : 1,
      song: normalizeSong(parsed.song),
    };
  } catch {
    return null;
  }
});
