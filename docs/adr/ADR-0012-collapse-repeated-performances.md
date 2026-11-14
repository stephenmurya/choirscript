# ADR-0012 — Collapse identical consecutive performances in rehearsal

**Status:** Accepted (implemented `arrangement.ts` `groupResolvedSections`)
**Date:** 2026-11-04
**Supersedes:** nothing. Refines ADR-0004's resolution step without changing the model.

## Context

`resolveArrangement` expands every occurrence `repeatCount` times, so a chorus marked ×4 resolved
to four `ResolvedSection` entries. Both rehearsal renderers and the arrangement rail rendered each
entry as a full block, with headings like `Chorus · repeat 2`, `· repeat 3`, `· repeat 4`.

On a phone that is four identical walls of lyrics with the same notes, and the singer has to work
out that nothing changes between them. The repetition is an artefact of how performance order is
stored, not of what the singer needs to read.

The realm does need repetition when a performance genuinely differs — e.g. the chorus sung
`Backups · melody (Alto)` and then the same chorus `Backups · SATB`, where the melody voicing hides
the other lanes.

## Decision

Group **consecutive** resolved entries that are indistinguishable to a singer into one block,
labelled with a repeat count:

- signature = `sourceSectionId · performer · voicing · melodyPart · note`
- adjacent entries with the same signature collapse, whether they come from one occurrence's
  `repeatCount` or from two separate occurrences configured identically
- a group renders the section **once**, with a `×N` badge **always shown**, including `×1`
- the badge is unconditional on purpose: a singer should never have to infer whether a line is
  sung once or several times, and an absent badge is exactly the ambiguity `×1` removes
- the block's DOM id stays `rehearsal-<first renderIdentity>`, so the rail, scroll-spy and any
  deep link keep working
- the arrangement rail shows `Chorus · ×4` instead of three "repeat N" rows

Anything that differs in the signature stays separate — that is the rule that keeps
melody-vs-SATB honest.

## Consequences

- A ×4 chorus occupies one screen instead of four; scroll length drops roughly in proportion to
  repetition in the arrangement.
- `repeatIndex` is no longer a render concept. Line keys use the group's `renderIdentity`, so a
  line's DOM identity is stable across repeats.
- Print inherits the behaviour automatically (same renderer) — a printed sheet no longer repeats
  the chorus four times.
- The group is a **view** concept only: storage, publishing and the editor's occurrence list still
  show every occurrence and its repeat count. Nothing is destroyed.
- When occurrence-level performance overrides arrive (C-05 in `product/features.md`), the
  signature will need to include the override payload, so two repeats that differ in timing or
  cues automatically split. That is the intended extension point, not a rewrite.

## Alternatives rejected

- **A per-view "collapse repeats" toggle.** Two ways to look at the same page, and the confusing
  one stays the default.
- **Hiding repeats entirely** (no badge). The singer must know the chorus comes four times; the
  arrangement rail and the printed sheet need the count.
- **Collapsing non-adjacent identical sections** (chorus, verse, chorus → one chorus block).
  It would remove the performance order, which is the one thing the rehearsal view must show.

## Related

- `docs/architecture/rendering-and-print.md` — renderer behaviour
- `docs/product/features.md` — G-16
- ADR-0004 (source/arrangement model), ADR-0011 (live shares)
