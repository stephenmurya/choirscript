import "server-only";

import { cache } from "react";
import { get, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { SharedSongPayload, Song } from "./songTypes";
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

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream);
  return response.text();
}

export function validateShareId(shareId: string) {
  return SHARE_ID_PATTERN.test(shareId);
}

export async function createSharedSong(song: Song): Promise<{ shareId: string; url: string }> {
  logBlobAuthMode();

  const shareId = nanoid(10);
  const now = new Date().toISOString();
  const payload: SharedSongPayload = {
    schemaVersion: 2,
    shareId,
    createdAt: now,
    updatedAt: now,
    title: song.title,
    artist: song.artist,
    key: song.key,
    bpm: song.tempo,
    song: {
      ...normalizeSong(song),
      updatedAt: song.updatedAt || now,
      createdAt: song.createdAt || now,
    },
  };

  await put(sharePathname(shareId), JSON.stringify(payload), {
    access: "private",
    allowOverwrite: false,
    contentType: "application/json",
  });

  return {
    shareId,
    url: `/s/${shareId}`,
  };
}

/**
 * Request-scoped shared-payload fetch. generateMetadata() and the page
 * component both need the payload for a shared link; React's cache() dedupes
 * the (stream-consuming) Blob GET within a single server request so the body
 * is fetched once. No cross-request caching — shares are immutable but we
 * don't want stale streaming handles.
 */
export const getSharedSong = cache(async (shareId: string): Promise<SharedSongPayload | null> => {
  if (!validateShareId(shareId)) {
    return null;
  }

  try {
    const result = await get(sharePathname(shareId), {
      access: "private",
      useCache: true,
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
      song: normalizeSong(parsed.song),
    };
  } catch {
    return null;
  }
});
