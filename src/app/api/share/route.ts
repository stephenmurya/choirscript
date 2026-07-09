import { createSharedSong } from "@/lib/share-store";
import type { Song } from "@/lib/songTypes";

const MAX_SHARE_PAYLOAD_BYTES = 1024 * 1024;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidSong(value: unknown): value is Song {
  return isRecord(value) && typeof value.title === "string" && value.title.trim().length > 0;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_SHARE_PAYLOAD_BYTES) {
    return jsonError("Share payload is too large.", 400);
  }

  let bodyText = "";

  try {
    bodyText = await request.text();
  } catch {
    return jsonError("Could not read request body.", 400);
  }

  if (new TextEncoder().encode(bodyText).byteLength > MAX_SHARE_PAYLOAD_BYTES) {
    return jsonError("Share payload is too large.", 400);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  if (!isRecord(parsed) || !isValidSong(parsed.song)) {
    return jsonError("A song with a title is required.", 400);
  }

  try {
    const share = await createSharedSong(parsed.song);
    return Response.json({
      shareId: share.shareId,
      url: new URL(share.url, request.url).toString(),
    });
  } catch (error) {
    console.error("Could not create ChoirScript share link", error);
    return jsonError("Could not create share link.", 500);
  }
}
