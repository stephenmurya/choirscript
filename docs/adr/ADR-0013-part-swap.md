# ADR-0013 — Part swap is an arrangement-placement transformation

**Status:** Accepted (implemented in `src/lib/partSwap.ts` + both rehearsal renderers)
**Date:** 2026-11-06

## Context

Choirs routinely change who sings what inside a song: men take the melody for a verse, women take
the harmony, or the four parts rotate so everyone learns another line. The Source/Arrangement model
has one canonical set of SATB notes per syllable, so today the only way to express "this section,
but the parts have traded" is to duplicate the section and retype every note — which then diverges
the moment the original is edited.

The director's mental model is spatial: the choir stands in a ring, **soprano at the top, tenor to
the right, bass at the bottom, alto to the left**. A swap is therefore either a rotation of that
ring or an explicit reassignment.

## Decision

Add `swap?: PartSwap` to `ArrangementOccurrence` (the placement), not to the source section:

```ts
type PartSwap = {
  direction?: "clockwise" | "anticlockwise";
  map?: Partial<Record<VocalPart, VocalPart>>;   // target -> source
};
```

- **Rotation follows the ring of parts the song actually uses.** Clockwise sends each part's notes
  one position clockwise within that ring, so a SATB song rotates S → T → B → A → S, while a
  SAT-only song rotates a triangle, S → T → A → S. A part the song does not use is never handed a
  line and never appears in the rotation. Anticlockwise is the reverse.
- **Custom** is an explicit target → source map: `map.tenor = "soprano"` means the tenors sing what
  the sopranos used to sing. It wins over `direction` when both are present.
- **Rendering transforms, storage does not.** `applyPartSwapToSection` rewrites syllable part
  values in a copy at render time; `Song.source` is never mutated, so the canonical notes stay
  canonical and the same section can appear twice in one arrangement with two different swaps.
- **The lane label stays the singer's own part.** After a clockwise swap the Tenor lane shows the
  notes the sopranos used to read — the row is still "Tenor", because that is who reads it.
- **The swap is visible, and spelled out.** The section header carries a chip that names the
  movement as a **closed chain that starts and ends at the soprano**: `S → A → B → T → S` means the
  soprano sings the alto line, the alto sings the bass line, the bass sings the tenor line and the
  tenor sings the soprano line. The chain describes exactly what the renderer draws (target →
  source), and it is closed so the last movement is explicit rather than implied. A SAT song reads
  `S → A → T → S`. Non-permutation custom maps have no single cycle and are shown as pairs
  (`T→S · A→B`). The editor row carries the same chip, and the editor's mode buttons preview the
  chain they will produce for this song.
- **Grouping includes the swap.** Two adjacent placements with different swaps are different
  performances and must not collapse into one `×N` block (ADR-0012); the group signature includes a
  stable serialisation of the resolved map.
- **Normalisation.** `normalizePartSwap` drops invalid parts, drops a map that resolves to identity,
  and drops an unknown direction — so a no-op swap never survives a save.

## Consequences

- A swapped chorus is one placement with a chip, not a duplicated section with retyped notes.
- Print inherits the swap automatically (same renderer).
- Melody voicing and swap compose: the melody lane reads the value *after* the swap, which is the
  behaviour a director expects when the melody part itself has been rotated.
- Timing, techniques and annotations are untouched by a swap — they belong to syllables, not to
  voices. A technique scoped to "Soprano" therefore stays with the soprano line rather than
  following the notes; this is deliberate but is the one place a director may disagree, and it is
  worth a UI check before anyone relies on per-part techniques in a swapped section.
- Occurrence-level swap does not extend to per-line or per-bar swaps. If a song changes mid-section,
  split the source section instead.

## Alternatives rejected

- **Duplicate the section and retype the notes.** Divergence guaranteed; the whole point of the
  Source/Arrangement split is that content exists once.
- **Store swapped notes in Source.** Destroys the canonical line and makes "unswap" impossible.
- **Express the swap as an existing performer label or note.** It reads as prose in rehearsal and
  cannot drive rendering.
- **Automatic swap inference.** Guessing that a repeated section is swapped because it sounds
  different is not something the data can support.

## Related

- ADR-0004 (source/arrangement model), ADR-0012 (collapsing identical performances)
- `docs/product/features.md` — G-18
- `docs/architecture/rendering-and-print.md` — renderer behaviour
