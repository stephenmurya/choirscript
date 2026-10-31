# ADR-0004: Canonical Source sections plus Arrangement occurrences

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`. Design rationale in
`docs/phase-3-source-arrangement-architecture.md`.

## Context

Before Phase 3, a song was a flat `sections[]` array in performance order. Repeating a chorus
meant duplicating the section: lyrics, SATB cues, techniques, director notes, and timing were
copied, and later edits had to be made in every copy. Reordering meant moving whole sections and
losing the distinction between "the chorus" and "this placement of the chorus".

The editor also needs to show a section that is not in the current set list (a cut verse) and to
show the same section more than once.

## Decision

Separate canonical content from placement:

```
Song.source.sections: SourceSection[]        // canonical lyrics, cues, techniques, timing target
Song.arrangements: Arrangement[]             // ordered placements
  Arrangement.occurrences: { id, sourceSectionId, note?, repeatCount? }[]
Song.activeArrangementId: string
```

- Lyrics, SATB cues, techniques, director notes, and timing remain canonical in Source.
- An occurrence stores only placement identity plus an occurrence-local note and a repeat count.
- Rendering resolves occurrences to sections and expands repeats into render rows
  (`resolveArrangement`, `src/lib/arrangement.ts:52`).
- Deleting a Source section cascades to its occurrences and timing
  (`deleteSourceSectionWithOccurrences`, `:235`); deleting an occurrence never touches Source.
- `normalizeSong` drops any occurrence whose section no longer resolves rather than keeping a
  silent dangler (`src/lib/songStorage.ts:359`).
- Multiple arrangements are structurally supported, but the UI only edits the active one.

## Consequences

Positive:

- One edit to a chorus updates every performance of it.
- Reordering and repeating are cheap: reorder the array, or raise `repeatCount`.
- Song size grows with distinct content, not with performance length.
- Occurrence ids are stable across reorder, leaving room for future placement-scoped data
  (band cues, production notes).

Negative and accepted:

- Two-level traversal everywhere (`source.sections` plus `arrangements`), which every renderer
  and mutation must respect.
- Occurrence-specific performance differences cannot be expressed yet; only a free-text note and
  a repeat count exist.
- A song can contain Source content that no arrangement uses, which is intentional but easy to
  mistake for a bug.
- Deletion semantics differ between Source sections (cascade) and occurrences (placement only),
  so the UI must explain which is which (`src/components/SongEditor.tsx:867`-`:875`).

## Alternatives rejected

- **Duplicate sections per performance (status quo).** Duplication and drift; the problem this
  ADR exists to solve.
- **Timing and annotations per occurrence.** Would copy the largest parts of the aggregate per
  placement and orphan them on lyric edits (Phase 3A section E).
- **A single arrangement object instead of an array.** Would force a schema migration the first
  time a second arrangement (concert vs rehearsal) is needed.

## Evidence

- `src/lib/songTypes.ts:137`-`:192`
- `src/lib/arrangement.ts:52`-`:101`, `:235`-`:257`
- `src/lib/songStorage.ts:287`-`:408`
- `src/components/ArrangementEditor.tsx`
- `src/components/ColorfulRehearsalView.tsx:272`
