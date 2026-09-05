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

/**
 * Development-safe diagnostic category for Blob failures. Returned to the
 * client alongside the generic user copy so localhost/preview environments
 * reveal the failure class; production consoles get the same detail via the
 * server log below. No tokens or credentials are included.
 */
function diagnosticCodeFromError(error: unknown): string {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "object" && error !== null && "name" in error
        ? String((error as { name: unknown }).name)
        : "";

  if (name.startsWith("Blob")) {
    // e.g. BlobAccessError, BlobStoreNotFoundError, BlobTokenNotFoundError…
    return `blob:${name}`;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("No blob credentials found") || message.includes("BLOB_READ_WRITE_TOKEN")) {
    return "blob:no-credentials";
  }
  if (message.includes("BLOB_STORE_ID") || message.includes("storeId")) {
    return "blob:no-store-id";
  }
  if (message.toLowerCase().includes("oidc")) {
    return "blob:oidc";
  }

  return "blob:unknown";
}

function logBlobError(error: unknown) {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "object" && error !== null && "name" in error
        ? String((error as { name: unknown }).name)
        : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? String((error as { status: unknown }).status)
      : "";

  console.error(
    `[share] Blob put() failed — name=${name || "unknown"} status=${status || "n/a"} code=${code || "n/a"} diagnostic=${diagnosticCodeFromError(error)}\n[share] message: ${message}`,
    error,
  );
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
    // Print the REAL Blob exception server-side: class name, SDK status/code,
    // and message. No tokens or credentials are logged.
    logBlobError(error);
    return Response.json(
      {
        error: "Could not create share link.",
        // Development-safe diagnostic category (no secrets).
        diagnostic: diagnosticCodeFromError(error),
      },
      { status: 500 },
    );
  }
}
