# ADR-0006: Share links are immutable JSON snapshots in Vercel Blob

Status: **Superseded by [ADR-0011](ADR-0011-live-share-links.md)** — share links are a moving head
and the editor republishes on save. The mechanics below (Blob storage, payload shape, schemaVersion
2) still apply; only the "write once" guarantee is gone.
Recorded: 2026-10-31, derived from code at commit `a79c7b1`. First implemented in `d8dbf1d`
(2026-07-10, "Update: Added shareable links"), later reshaped for schemaVersion 2.

## Context

Directors need to send a rehearsal sheet to singers who may not have accounts. Two broad options
exist: a public route that renders the live song from Firestore, or a stored snapshot.

A live public route would require either public read access to song documents (breaking the
membership model) or a server endpoint reading Firestore with elevated credentials. It would
also mean a link silently changes when the director edits the song, which is dangerous for a
rehearsal sheet someone printed or sent to a choir.

## Decision

`POST /api/share` writes an immutable JSON snapshot to Vercel Blob and returns a `/s/{shareId}`
URL:

- Payload is `SharedSongPayload` with `schemaVersion: 2`, the share id, timestamps, duplicated
  top-level display fields (`title`, `artist`, `key`, `bpm`), and the normalized `song`
  (`src/lib/songTypes.ts:194`, `src/lib/share-store.ts:51`).
- Storage is `shares/{shareId}.json` with `access: "private"` and `allowOverwrite: false`
  (`src/lib/share-store.ts:67`). Immutability is enforced by the storage layer.
- `shareId` is `nanoid(10)`, matching `/^[A-Za-z0-9_-]{10,32}$/` and validated on read
  (`:9`, `:42`, `:49`).
- The read path is a server component with `generateMetadata`, using React `cache()` so the
  stream-consuming Blob GET runs once per request (`:79`-`:116`).
- Reads accept `schemaVersion` 1 or 2 and normalize in memory, so old links keep working after
  model changes (`:104`-`:112`).
- Payloads are capped at 1 MiB, checked from `Content-Length` and from the encoded body
  (`src/app/api/share/route.ts:4`, `:78`, `:90`).

## Consequences

Positive:

- No public read access to Firestore is required; rules stay membership-only.
- A link is a stable artifact: editing the song never changes what a singer sees.
- The shared page is server-rendered with real metadata for link previews
  (`src/app/s/[shareId]/page.tsx:49`).
- Schema migration of old links is free, because normalization happens at read.

Negative and accepted:

- Every share is a full copy of the song. Storage grows linearly with share count, and there is
  no deduplication.
- There is no revocation, expiry, or deletion path in the code (no `del()` usage, no admin
  route).
- `POST /api/share` is unauthenticated, so anyone can create a snapshot of arbitrary content up
  to 1 MiB.
- Share creation fails entirely when Blob credentials are absent; the failure is surfaced as a
  diagnostic string rather than a graceful degradation.
- The snapshot duplicates display fields, so a change to `title`/`artist` formatting must be
  applied in two places (`SharedSongPayload` fields and `payload.song`).

## Alternatives rejected

- **Live public route reading Firestore.** Requires loosening rules or adding a privileged
  server reader, and links would mutate under the recipient.
- **Firestore document per share with public read.** Same mutation problem plus rules
  complexity; Blob gives immutable objects and cheap large reads.
- **Signed URLs with expiry.** Not implemented; would break printed sheets and long-lived
  rehearsal links.

## Evidence

- `src/lib/share-store.ts` (whole file)
- `src/app/api/share/route.ts:75`-`:125`
- `src/app/s/[shareId]/page.tsx:44`-`:150`
- `src/lib/songTypes.ts:194`-`:204`
- `src/components/ShareDialog.tsx:65`-`:99`
