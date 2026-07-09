import "server-only";

import { get, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { SharedSongPayload, Song } from "./songTypes";

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;

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
  const shareId = nanoid(10);
  const now = new Date().toISOString();
  const payload: SharedSongPayload = {
    schemaVersion: 1,
    shareId,
    createdAt: now,
    updatedAt: now,
    title: song.title,
    artist: song.artist,
    key: song.key,
    bpm: song.tempo,
    song: {
      ...song,
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

export async function getSharedSong(shareId: string): Promise<SharedSongPayload | null> {
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

    if (parsed.schemaVersion !== 1 || parsed.shareId !== shareId || !parsed.song) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
