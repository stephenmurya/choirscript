# Architecture — Domain Model

**Purpose:** the musical and persistence schema as it exists, plus the fields that must be added
for the notation compiler, multi-arrangement UI and public publishing. Field-level Firestore
shapes live in `data-model.md`; this document is about meaning and invariants.

## Core entities

```text
Song (aggregate root)
├── metadata: title, artist, key, tempo, notes, voicePreset, enabledParts
├── source: { sections: SourceSection[] }         ← canonical musical material
│     └── SourceSection (verse/chorus/…)
│           └── SongLine[]
│                 ├── WordToken[] → SyllableToken[] (SATB + techniques + directorNote)
│                 └── TechniqueAnnotation[]
├── arrangements: Arrangement[]                   ← ordered references into source
│     └── ArrangementOccurrence { sourceSectionId, repeatCount, performer, voicing, melodyPart }
├── activeArrangementId
├── timingSettings + timingByLine: Record<lineId, LineTiming>
│     └── LineTiming { bars[], sharedEvents[], partOverrides{} }
└── share?: { id, editToken, publishedAt }        ← live publication handle
```

### Invariants that hold today

1. **Source is the only home of musical content.** Occurrences carry sequence and performance
   metadata; they never duplicate lyrics, SATB, techniques or timing.
2. **Ids are stable strings** (`createId("occ")` etc.). Reordering never changes identity;
   duplication always mints new ids and remaps references (`duplicateLine`, `duplicateSection`).
3. **Arrangement resolution is pure.** `resolveArrangement(song)` returns the render sequence
   (`ResolvedSection[]`) with no side effects, and both rehearsal views and the shared page use it.
4. **Timing is structured.** Events carry `startUnit`/`durationUnits` in beat units; bars carry
   `beats`/`beatUnit`/`subdivision`. Nothing is stored as textual notation.
5. **Per-part timing is an override, not a copy.** `partOverrides[part]` replaces the shared event
   list for that part on that line; `resetPartOverride` restores the shared behaviour.
6. **Normalisation happens once**, at the boundary (`normalizeSong`), and is idempotent.

### Deliberate gaps in the model

| Gap | Consequence | Where it bites |
| --- | --- | --- |
| One note string per part per syllable | No melisma, no chords | Any realistic SATB arrangement with split syllables or held vowels across moving parts |
| No octave or accidental dimension | Pitch is 8 diatonic names (`Do…Ti`) | Anything outside a single key/octave; any accidental |
| No meter grouping model | 6/8 is "six beats" | Beat labels, barlines and the future notation compiler |
| Tempo is a string | Cannot compute durations in seconds | Playback, practice tracks, export timing |
| No revision history | Undo is in-memory only | Collaboration, "restore this version", public page history |
| No arrangement-level overrides | Repeated sections cannot differ in performance | Repeated choruses with a different ending or cue |

## Proposed additions (not implemented)

### For the notation compiler

```ts
type Pitch = { degree: 1..7; octave: number; accidental?: "sharp" | "flat" | "natural" };
type SyllableMusic = { part: VocalPart; notes: NoteEvent[] };   // ≥1 note per part → melisma
type NoteEvent = { pitch: Pitch; units: number; tieToNext?: boolean };
```

`syllable.soprano: string` becomes a compatibility view over `SyllableMusic`; migration maps each
existing note name to `{ degree, octave: 0 }`. This is the single largest schema change in the
pre-migration list and it must land behind a normaliser so old documents keep loading.

### For multiple arrangements

No schema change is required — `arrangements[]` and `activeArrangementId` already exist. What is
missing is UI plus a decision on whether `name` is unique per song (recommended: yes, for stable
public URLs).

### For publication

```ts
type Publication = {
  visibility: "private" | "unlisted" | "public";
  slug?: string;              // human-readable, unique per creator
  creatorId: string;
  revisionId: string;         // immutable snapshot currently published
  publishedAt: string;
  rights: RightsDeclaration;  // see asset-rights-and-storage.md
};
```

Today's `song.share` is the prototype of this and should be generalised, not replaced ad hoc.

## Identity and referential integrity

- **Stable ids** — `section.id`, `line.id`, `word.id`, `syllable.id`, `bar.id`, `event.id`,
  `occurrence.id`. They survive reorder, duplicate (new ids), and save/load.
- **References** — occurrences → sections; timing events → syllable ids, section/line ids;
  annotations → syllable ids. Deleting a section removes its occurrences
  (`deleteSourceSectionWithOccurrences`); deleting a line/syllable prunes dependent timing and
  annotations on that edit path.
- **Not checked globally** — there is no `validateSong(song)` that reports dangling references.
  `normalizeSong` repairs shapes, not relationships. This is C-07 in `../product/features.md`.

## Persistence mapping (today)

| Entity | Location |
| --- | --- |
| Song body | `workspaces/{wid}/songs/{songId}/document/current` |
| Song summary card | `workspaces/{wid}/songs/{songId}` (denormalised for the library list) |
| Membership | `workspaces/{wid}/members/{uid}` (`role`) |
| Profile | `users/{uid}` |
| Workspace | `workspaces/{wid}` |
| Share payload | Blob `shares/{shareId}.json` |
| Share revision head | Blob `shares/{shareId}.rev.json` |
| Share edit token | Blob `shares/{shareId}.key.json` |
| Share doorbell | Firestore `shareHeads/{shareId}` |

## Migration to relational (target)

The relational shape mirrors the entity tree with explicit revision rows:

```text
songs, sources, source_sections, lines, words, syllables, techniques,
song_part_notes(syllable_id, part, notes jsonb),  -- or a notes table with ordering
arrangements, arrangement_occurrences, timing_lines, timing_bars, timing_events,
publications, arrangement_revisions, users, organisations, memberships
```

Two decisions to make when the schema is written: whether SATB notes are a JSON column per
syllable (simpler, queryable only in bulk) or a row per note (queryable, more joins). The
compiler only ever needs whole lines, so a JSON column per syllable is the pragmatic default;
the diff engine in `contributions-and-revisions.md` benefits from rows. Recommendation: **JSON
per syllable for v1 of the migration, with a view that explodes it**, because it keeps the
migration script simple and the diff engine can compare JSON.
