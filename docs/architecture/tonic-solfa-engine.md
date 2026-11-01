# Architecture — Tonic-Solfa Notation Engine

**Purpose:** the design for turning structured song data into traditional tonic-solfa notation in
Rehearsal View, so users stop typing punctuation and the notation becomes a computed artifact.

**Status: NOT STARTED.** Everything below is a proposal. Nothing here may be represented as
implemented, and the compiler must remain independent of the editor, persistence and any backend.

## The decision

Keep the existing visual editor for precise authoring. Make **traditional tonic-solfa notation the
primary presentation** in Rehearsal View, derived from notes + timing rather than typed.

```text
Song / resolved Arrangement
        │  compile(arrangement, options)
        ▼
   SolfaScore  (pure data, no React, no DOM)
        │  render(score, mode, theme)
        ▼
   Rehearsal DOM / print DOM / (later) SVG + PDF
```

Three properties are non-negotiable:

1. **Pure.** `compile` has no side effects, no `window`, no storage, no network. Same input, same
   output, always.
2. **Total.** Every valid song compiles. Malformed input degrades (a dropped note) but never throws
   into the renderer.
3. **Lossless for the renderer.** Everything the view needs — barlines, ties, holds, rests,
   pickups, section boundaries, technique spans, director notes — is present in the score, not
   recomputed in the component.

## Intermediate representation

```ts
type SolfaScore = {
  meta: { title: string; key?: string; meter: string; tempo?: string; creator?: string };
  systems: System[];          // one per section occurrence, wrapped into lines for layout
  warnings: CompileWarning[]; // never thrown; surfaced in a dev overlay
};

type System = {
  occurrenceId: string;
  label: string;              // "Chorus · repeat 2" / "Lead"
  voicing: "harmony" | "melody";
  melodyPart?: VocalPart;
  bars: RenderedBar[];
  sections: SectionMark[];    // where each source section starts/ends inside the system
};

type RenderedBar = {
  index: number;
  isPickup: boolean;
  beats: number;
  beatUnit: number;
  columns: Column[];          // one column = one vertical slice of the score
};

type Column = {
  unitStart: number;          // absolute unit within the bar
  units: number;              // duration in units
  syllable?: { id: string; text: string; tieToNext?: boolean };
  parts: Partial<Record<VocalPart, RenderedNote>>;
  techniqueSpans: { techniqueId: string; symbol: string; appliesTo: VocalPart[] }[];
  directorNote?: string;
  isBarline: boolean;
};

type RenderedNote = {
  solfa: string;              // "d" "r" "m" "f" "s" "l" "t" — or "d1" style with octave
  octave: number;             // 0 = middle; dots above/below
  accidental?: "sharp" | "flat" | "natural";
  durationUnits: number;
  kind: "note" | "rest" | "hold" | "break";
  pitch?: Pitch;              // resolved pitch, for future audio
};
```

The score is deliberately **row-agnostic**: it emits columns, and the renderer decides which
columns belong on which system line. Pagination and wrapping therefore become layout concerns,
which is what makes print and mobile share one compiler.

## Compilation stages

| Stage | Input → Output | Rules |
| --- | --- | --- |
| 1. Resolve | `Song` → ordered occurrences | `resolveArrangement`; repeat ×N expands to N systems with `repeatIndex` |
| 2. Timing join | occurrence + `LineTiming` → bars with events | Shared events unless a part override exists; `getEventAbsoluteStart` for absolute units |
| 3. Note join | syllable + part → `RenderedNote` | Note name → `solfa` + `octave`; missing note → empty cell, never a placeholder |
| 4. Duration → glyphs | units → dashes/commas/dots | See rendering rules below |
| 5. Bar assembly | events → bars → columns | Barlines drawn at bar boundaries; pickup marked |
| 6. Annotation overlay | `TechniqueAnnotation[]` → spans | Span across the syllable range, per part; symbol at range start |
| 7. Section marks | occurrence boundaries | Section label placed at the first column of the section |
| 8. Warnings | anything unresolved | Orphaned timing event, note without syllable, bar overflow |

## Rendering rules (traditional tonic-solfa)

These are the conventions a choir actually reads. They are compiled, never typed.

| Element | Convention | Derived from |
| --- | --- | --- |
| Barline | `|` | bar boundary in `LineTiming.bars` |
| Double barline | `||` | end of system / section end |
| Note | Solfa syllable (`d r m f s l t`, with `d1`/`d,` octave marks) | pitch + octave |
| Half note (2 units at half-beat subdivision = 1 beat) | Note + `-` per additional beat | `durationUnits` |
| Quarter/beat note | Note with no dash | `durationUnits == 1 beat` |
| Eighth/sub-beat | Note + `,` under/after (dots for 6/8) | subdivision from `Bar` |
| Hold / tie across bar | `-` continuing through the barline | hold event or `tieToNext` |
| Rest | `-` with no note (or `0` in teaching notation) | `rest` timing event |
| Break | `| |` gap with no column | `break` event |
| Octave above | dot above the note (`d·`) | `octave > 0` |
| Octave below | dot below (`d.`) | `octave < 0` |
| Accidental | `#` / `b` before the note | `accidental` |
| Slur / melisma | curved bracket across notes on one syllable | multiple `NoteEvent`s on one syllable |
| Pickup | partial bar with a bracket and beat count | `isPickup` |
| Comma (breath) | `,` after the syllable | explicit annotation only — never inferred |

Design decision: **dash and comma placement must be deterministic and documented in tests**, not
tuned by eye. The compiler emits glyph tokens; the renderer only positions them.

## Rehearsal modes

Modes are compile options, not separate renderers.

| Mode | Content | Notes |
| --- | --- | --- |
| **Full score** | All enabled parts, aligned columns | Default on desktop |
| **My Part** | One part, large type, other parts hidden but columns preserved | Phone default once a preference exists |
| **Selected parts** | Any subset, user-configurable | Persist per user, not per device |
| **Lyrics only** | Syllables and section labels, no notes | For memorisation |
| **Print / PDF** | Full score paginated into systems | Same score, print renderer |

All parts stay aligned when wrapping: a column that spans parts is never split across systems.

## Compiler test fixtures

Fixtures are plain JSON `{ song, options, expected }` under `docs/architecture/fixtures/` (to be
created with the first implementation). Minimum set:

1. Four bars of 4/4, one note per beat, one part → exact glyph string.
2. Holds across a barline.
3. Rest and break events between syllables.
4. Pickup bar of 1 and 3 beats.
5. 6/8 with two-note grouping per beat (once F-08 exists).
6. Per-part override where alto holds while soprano moves.
7. Repeat ×2 with a different director note per repeat.
8. Melisma: one syllable, three notes (after E-08).
9. Section boundary in the middle of a system.
10. Malformed input: timing event referencing a deleted syllable → warning, no throw.

Each fixture should be executable without React, which is the point of keeping `compile` pure.

## Dependencies and risks

| Risk | Mitigation |
| --- | --- |
| Pitch model cannot express octaves/accidentals | Land E-07 first; migration maps note names to `{degree, octave:0}` |
| Melisma changes the syllable schema | Land E-08 behind the normaliser; keep `syllable.<part>: string` as a compatibility view until migration |
| Two renderers drift apart | Compiler becomes the single source of truth; the simple view is re-expressed as a score renderer or retired |
| Typography on phones | Prefer SVG or a monospace grid with fixed metrics; measure, do not eyeball |
| Print pagination | Systems are a layout output of the score, so print and screen share the break logic |

## Related

- `core-editor.md` — authoring surfaces that feed the compiler
- `domain-model.md` — the pitch/note schema change this depends on
- `../product/features.md` — E-07, E-08, F-11, G-09
- ADR-0009 (print via browser), ADR-0007 (part-scoped timing)
