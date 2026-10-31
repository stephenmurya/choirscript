# ADR-0003: Split each song into a metadata document and a body document

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

The dashboard lists songs with title, artist, key, tempo, mode, recency, module icons, and
contributor avatars. The editor needs the entire aggregate: sections, words, syllables, SATB
cues, annotations, timing bars, and events. Loading every song body to render the dashboard
would multiply read volume and latency by the size of the library.

Firestore has a 1 MiB document limit; a single document per workspace would be unworkable, and
a single document per song is the natural aggregate boundary.

## Decision

Two documents per song:

```
workspaces/{wid}/songs/{songId}                      SongMeta (listing data + cardSummary)
workspaces/{wid}/songs/{songId}/document/current     SongDocument { schemaVersion, song, updatedAt, updatedBy }
```

The listing surface reads only the metadata collection (`listSongs`,
`src/lib/firebase/songs.ts:150`). The editor reads both documents in parallel
(`getSongWithMeta`, `:172`). Writes pair them in one `writeBatch` (`createSong` `:241`,
`saveSong` `:271`, `deleteSong` `:306`).

The metadata document carries a denormalized `cardSummary` (module presence plus contributor
preview) so cards never need the body. Stale summaries are backfilled lazily, one body read per
stale song, deduped per session (`src/lib/firebase/songs.ts:329`).

## Consequences

Positive:

- Dashboard cost scales with the number of songs, not with song size.
- Body and metadata cannot drift on a successful write (atomic batch).
- Card rendering has no dependency on the body schema, which is what let the aggregate migrate
  from schema 1 to 2 without touching the dashboard.
- Deleting one document pair is a clean operation.

Negative and accepted:

- Two documents to keep consistent; a partially interrupted create (metadata without body) is
  treated as "song not found" (`src/lib/firebase/songs.ts:192`).
- `cardSummary` is derived state that can be stale until backfill runs.
- Two version numbers to reason about: `SongMeta.schemaVersion` is 1 and `Song.schemaVersion`
  is 2 (`src/lib/firebase/types.ts:86`, `src/lib/songTypes.ts:191`).
- A metadata write on every autosave doubles write count compared with body-only writes.

## Alternatives rejected

- **Single song document including list fields.** Every dashboard render would fetch all bodies;
  also pushes closer to the 1 MiB limit.
- **Body in a subcollection sharded by section.** Would require transactions or accept partial
  songs, and the editor always needs the whole aggregate.
- **Computing the card summary on read.** Would require the body, defeating the split.

## Evidence

- `src/lib/firebase/types.ts:75`-`:95`
- `src/lib/firebase/songs.ts:30`-`:40`, `:150`-`:203`, `:216`-`:314`
- `src/lib/songSummary.ts:63`-`:113`
- `src/components/WorkspaceHomePage.tsx:222`-`:224` (cards read only `cardSummary`)
