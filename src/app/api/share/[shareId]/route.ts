import { getSharedSong, publishSharedSong, validateShareId } from "@/lib/share-store";
import type { Song } from "@/lib/songTypes";

const MAX_SHARE_PAYLOAD_BYTES = 1024 * 1024;

// A share is a moving head; nothing here may be answered from a cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidSong(value: unknown): value is Song {
  return isRecord(value) && typeof value.title === "string" && value.title.trim().length > 0;
}

type Params = { params: Promise<{ shareId: string }> };

/**
 * Full payload for live viewers. The editor polls /rev and only calls this when
 * the revision actually moved, so the song body crosses the wire once per
 * publish per viewer.
 */
export async function GET(_request: Request, { params }: Params) {
  const { shareId } = await params;

  if (!validateShareId(shareId)) {
    return jsonError("Share not found.", 404);
  }

  const payload = await getSharedSong(shareId);

  if (!payload) {
    return jsonError("Share not found.", 404);
  }

  return Response.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}

/** Republish the link in place. Requires the edit token from creation. */
export async function PUT(request: Request, { params }: Params) {
  const { shareId } = await params;

  if (!validateShareId(shareId)) {
    return jsonError("Share not found.", 404);
  }

  let parsed: unknown;

  try {
    const bodyText = await request.text();

    if (new TextEncoder().encode(bodyText).byteLength > MAX_SHARE_PAYLOAD_BYTES) {
      return jsonError("Song is too large to publish.", 400);
    }

    parsed = JSON.parse(bodyText);
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  if (!isRecord(parsed) || typeof parsed.editToken !== "string" || !isValidSong(parsed.song)) {
    return jsonError("An edit token and a song are required.", 400);
  }

  const result = await publishSharedSong(shareId, parsed.editToken, parsed.song);

  if (result === "missing") {
    return jsonError("Share not found.", 404);
  }

  if (result === "forbidden") {
    return jsonError("This link was created elsewhere, so it cannot be republished.", 403);
  }

  return Response.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
