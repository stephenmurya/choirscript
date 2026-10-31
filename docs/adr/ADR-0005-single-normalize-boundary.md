# ADR-0005: A single `normalizeSong()` sanitizer and migration boundary

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

Song data arrives from several directions: Firestore bodies written by older versions,
localStorage data from before the cloud move, Blob snapshots of unknown age, duplicated songs,
and in-memory edits. Each source can be missing ids, timing, bass cues, arrangements, or
annotations. The app also had to migrate a flat `sections[]` model to `source.sections` plus
`arrangements` without a server-side migration job.

Handling repair at each call site would produce divergent behavior and repeated bugs: a song
opened in the editor and the same song opened from a share link could normalize differently.

## Decision

One function, `normalizeSong(input: Song): Song` in `src/lib/songStorage.ts:284`, is the only
sanitizer and migration boundary. It is called on every path where a song enters application
state or leaves it:

| Path | Call site |
| --- | --- |
| Editor load | `src/components/SongEditor.tsx:135` |
| Rehearsal load | `src/components/RehearsalView.tsx:73` |
| Cloud create/save | `src/lib/firebase/songs.ts:224`, `:262` |
| Card-summary backfill | `src/lib/firebase/songs.ts:357` |
| Share create | `src/lib/share-store.ts:61` |
| Share read | `src/lib/share-store.ts:111` |
| Legacy import | `src/lib/firebase/migration.ts:144` |
| Legacy localStorage read | `src/lib/songStorage.ts:426` (unused UI path) |

It composes three lower-level migrations in a fixed order: `migrateSongToSourceArrangement`
(`src/lib/arrangement.ts:265`), `migrateSongTiming` (`src/lib/timing.ts:705`), then structural
repair and reference pruning (annotations, arrangements, active id, voice defaults), then
`ensureTimingForSong` for advanced-mode songs. Details in
[../architecture/data-model.md](../architecture/data-model.md#normalization-pipeline).

It is pure: no Firestore, no React, no storage access. It is idempotent: running it on its own
output changes nothing.

## Consequences

Positive:

- One place to reason about every historical shape; a new repair is added once.
- The repository can normalize on both read and write, so a malformed document cannot be
  re-persisted as-is.
- Share snapshots of the old schema remain readable indefinitely without rewriting Blobs.
- The function is directly testable in isolation (currently only by the manual scripts).

Negative and accepted:

- It is a large function with a long ordering dependency; changing step order can silently alter
  data (for example, annotation pruning must happen after syllable ids are assigned).
- It repairs silently. There is no report of what was dropped, so data loss from a bad reference
  is invisible outside the diff.
- It is not a validator: it does not reject unknown technique ids, part lists, or impossible
  timing values.
- Because it runs on every save, a normalization bug propagates to storage immediately.

## Alternatives rejected

- **Zod/valibot schema parsing.** Would validate shape but not perform the semantic migrations
  (v1 to v2, timing repair, dangling references). No schema library is in `package.json`.
- **Normalize only at read.** Would allow malformed data written by other clients to persist
  indefinitely and would not protect the write path.
- **A server-side migration job.** The Phase 3A document rejected it: lazy migration through the
  existing boundary is cheaper and needs no operational window.

## Evidence

- `src/lib/songStorage.ts:273`-`:284` (contract comment), `:284`-`:408` (implementation)
- `src/lib/arrangement.ts:265`-`:289`
- `src/lib/timing.ts:664`-`:688`, `:705`-`:712`
- Call sites listed in the table above
