# Data model

The persisted aggregate is `Song` in `src/lib/songTypes.ts:169`. It is stored whole as JSON in
one Firestore document (see [backend/README.md](../backend/README.md)). Everything in this
document is about that aggregate and the metadata documents that point at it.

## Aggregate shape

```
Song
  id, title, artist?, key?, tempo?, notes?
  mode: "simple" | "advanced"
  bassEnabled?: boolean
  voicePreset?: "satb" | "sab" | "ssa" | "ttbb" | "unison" | "custom"
  enabledParts?: ("soprano" | "alto" | "tenor" | "bass")[]
  schemaVersion: 2

  source
    sections: SourceSection[]
      id, name, type?
      lines: SongLine[]
        id
        words: WordToken[]
          id, originalWord
          syllabification?: "pending" | "auto" | "manual"
          syllables: SyllableToken[]
            id, text
            soprano: string
            alto: string
            tenor: string
            bass?: string
            techniques: AppliedTechnique[]
            directorNote?: string
        annotations: TechniqueAnnotation[]
          id, techniqueId
          syllableIds: string[]
          appliesTo: VoicePart[]      // "all" | soprano | alto | tenor | bass
          note?, label?, createdAt

  arrangements: Arrangement[]
    id, name
    occurrences: ArrangementOccurrence[]
      id, sourceSectionId, note?, repeatCount?
  activeArrangementId: string

  timingSettings: SongTimingSettings
    meterPreset, beatsPerBar, beatUnit, subdivision, hasPickupBar, pickupBeats?
  timingByLine: Record<lineId, LineTiming>
    lineId
    bars: Bar[]                    // id, sectionId, lineId, index, isPickup?, beats, beatUnit, subdivision
    sharedEvents: TimingEvent[]
    partOverrides: Partial<Record<VocalPart, TimingEvent[]>>
      TimingEvent: id, type ("syllable"|"hold"|"rest"|"break"), syllableId?, sectionId,
                   lineId, barId, scope ("shared"|VocalPart), startUnit, durationUnits,
                   label?, note?

  createdAt, updatedAt
```

Type references: `SyllableToken` `src/lib/songTypes.ts:85`, `WordToken` `:98`, `SongLine` `:106`,
`SourceSection` `:133`, `ArrangementOccurrence` `:151`, `Arrangement` `:162`, `Song` `:169`,
`LineTiming` `:68`, `TimingEvent` `:43`, `TechniqueAnnotation` `:75`, `SharedSongPayload` `:194`.

## Field notes that are easy to get wrong

**`bass`, not `bassEnabled`, decides whether a bass cue exists.** `SyllableToken.bass` is
optional, and `normalizeSong` converts an empty string to `undefined`
(`src/lib/songStorage.ts:315`). The editor
writes `undefined` when the user clears a bass cell and the part is bass
(`src/components/SongEditor.tsx:712`).

**Part enablement is song-level only.** `Song.enabledParts`, `Song.voicePreset`, and
`Song.bassEnabled` are the only part switches. `SongLine` and `SourceSection` carry no
part-enablement fields (`src/lib/songTypes.ts:106`, `:133`). Per-line and per-section part
assignment is planned, not implemented.

**`WordToken.syllabification` is three-state.**
`pending` words hold the entire unsplit word as a single syllable and are prepared when the
editor enters Parts or when the song switches to advanced mode
(`src/components/SongEditor.tsx:193`, `:225`, `src/lib/lineText.ts:120`). `auto` means produced
by the splitter; `manual` means a human edited the split. `normalizeSong` defaults a missing
value to `manual` (`src/lib/songStorage.ts:307`), so migrated v1 songs are treated as
intentionally split rather than pending.

**Annotations are the render-time authority; syllable.techniques is a parallel copy.**
Technique badges, highlights and range labels are derived from `line.annotations`
(`src/lib/annotationUtils.ts:108`, `src/components/ColorfulRehearsalView.tsx:196`).
`TechniqueLegend` instead scans `syllable.techniques` (`src/components/TechniqueLegend.tsx:14`).
The two representations are not kept in sync on apply: `applyTechniqueToSyllables` appends an
annotation but does not push into `syllable.techniques`
(`src/lib/annotationUtils.ts:313`), while `removeTechniqueFromSyllableIds` removes from both
(`:364`). `normalizeSong` only synthesizes annotations from `syllable.techniques` when the
line's annotation array is empty (`src/lib/songStorage.ts:238`). Consequence: a technique
applied in the current editing session renders on syllables but may be missing from the
technique legend until the song is reloaded. This is a verified inconsistency, not a design
statement.

**`appliesTo` is stored, not enforced.** `getAnnotationsForSyllable` filters by syllable id
only (`src/lib/annotationUtils.ts:108`), and all writes set `appliesTo: ["all"]`
(`src/lib/annotationUtils.ts:345`, `src/lib/songStorage.ts:136`). No UI writes a part-specific
annotation today.

**Timing is per canonical line, never per occurrence.** `timingByLine` is keyed by `line.id`
(`src/lib/songTypes.ts:187`). A repeated section re-renders the same timing. The
`ArrangementOccurrence` type deliberately has no timing fields; the reserved seam is described
in the Phase 3A document section E and remains unbuilt.

**`repeatCount` is a rendering multiplier, not extra occurrences.** `Arrangement.occurrences`
stores one entry with `repeatCount: n`; `resolveArrangement` expands it into n render rows
(`src/lib/arrangement.ts:72`). `normalizeRepeatCount` clamps to integers in
`[1, MAX_REPEAT_COUNT]` where `MAX_REPEAT_COUNT = 32` (`src/lib/arrangement.ts:23`, `:25`).

## Identity

| ID | Created by | Stability |
| --- | --- | --- |
| `song.id` | `createId("song")` (`src/lib/songStorage.ts:18`) | Stable per song; regenerated on duplicate |
| `section.id` | `createId("section")` | Stable; referenced by occurrences |
| `line.id` | `createId("line")` | Stable; keys `timingByLine` |
| `word.id`, `syllable.id` | `createId("word"|"syllable")` | Stable; syllables are referenced by annotations and timing events |
| `annotation.id` | `createId("annotation")` | Stable |
| `bar.id`, `timingEvent.id` | `createId("bar"|"timingEvent")` | Stable |
| `arrangement.id` | `createId("arr")` | Stable |
| `occurrence.id` | `createId("occ")` | Stable across reorder (`reorderOccurrence` only reorders the array, `src/lib/arrangement.ts:163`) |
| `shareId` | `nanoid(10)` (`src/lib/share-store.ts:49`) | Immutable; validated by `/^[A-Za-z0-9_-]{10,32}$/` (`:9`) |

`createId` uses `crypto.randomUUID()` when available and falls back to
`${Date.now()}-${Math.random()...}` (`src/lib/songStorage.ts:18`).

Composite render identities (not persisted) are built as
`${occurrence.id}:${repeatIndex}` (`src/lib/arrangement.ts:84`) and are used for React keys and
the rehearsal DOM ids described in [rendering-and-print.md](rendering-and-print.md).

## Normalization pipeline

`normalizeSong()` is the single migration/sanitizer boundary. It runs on every cloud load
(`src/components/SongEditor.tsx:135`, `src/components/RehearsalView.tsx:73`), on every save in
the repository (`src/lib/firebase/songs.ts:224`, `:262`), on share creation and share read
(`src/lib/share-store.ts:61`, `:111`), and on legacy import (`src/lib/firebase/migration.ts:144`).

Order of operations, all in `src/lib/songStorage.ts:284`:

1. **v1 -> v2 structural migration** — `migrateSongToSourceArrangement`
   (`src/lib/arrangement.ts:265`). If the song already has both `source` and `arrangements` it
   is returned untouched. Otherwise sections are taken from `song.source.sections` or from the
   legacy top-level `song.sections`, moved by reference (IDs preserved), and a `Default`
   arrangement is created with one occurrence per section, `repeatCount: 1`.
2. **Timing settings normalization** — `migrateSongTiming` fills `mode`, `timingSettings`, and
   `timingByLine` defaults (`src/lib/timing.ts:705`); `normalizeSettings` derives
   `beatsPerBar`/`beatUnit` from `meterPreset` (`:45`).
3. **Aggregate field repair** — `id`, `title` (trimmed, default `Untitled Song`),
   `createdAt`, `updatedAt`, `schemaVersion: 2` (`src/lib/songStorage.ts:290`).
4. **Section/line/word/syllable repair** — missing ids are generated, section names defaulted,
   `word.syllabification` defaulted to `manual`, cue values normalized with the legacy alias
   `Sol -> So`, empty bass dropped, `techniques` defaulted to `[]` (`:298`-`:318`).
5. **Annotation repair** — `migrateLineAnnotations` either keeps and patches existing
   annotations (filling id/appliesTo/createdAt) or synthesizes them from `syllable.techniques`
   when the array is empty (`:238`). Annotations are then filtered to syllables that still
   exist and dropped when empty (`:328`-`:332`).
6. **Bass derivation** — `sourceHasBass` scans for any non-empty bass cue; `bassEnabled` is
   kept if it is already a boolean, otherwise derived from that scan (`:339`, `:391`).
7. **Arrangement sanitation** — arrangements are rebuilt: ids generated, names defaulted,
   occurrences with an unresolvable `sourceSectionId` dropped, notes trimmed to `undefined`,
   `repeatCount` normalized (`:350`-`:367`). If nothing valid remains, a `Default` arrangement
   mirroring Source order is created (`:369`).
8. **Active arrangement repair** — a dangling `activeArrangementId` falls back to the first
   arrangement (`:383`).
9. **Voice defaults** — `voicePreset` defaults to `"custom"`; `enabledParts` defaults to SATB
   when bass is enabled or bass cues exist, otherwise SATB without bass (`:397`-`:402`).
10. **Timing materialization** — only when `mode === "advanced"`, `ensureTimingForSong` drops
    timing for lines that no longer exist, creates default timing for every line, and rebars
    existing timing against the current meter (`src/lib/timing.ts:664`).

What `normalizeSong` deliberately does **not** do:

- It does not merge, deduplicate, rename, or reorder Source sections.
- It does not delete Source content. It only removes references that cannot resolve
  (annotations, occurrences) and timing for dead lines.
- It does not validate technique ids against `DEFAULT_TECHNIQUES`
  (`src/lib/defaultTechniques.ts`). Unknown ids render as nothing.
- It does not enforce `appliesTo`, part enablement, or the presence of cue text.
- It does not rewrite Blob share snapshots. Old snapshots are migrated in memory at read
  (`src/lib/share-store.ts:108`).

## Invariants a caller can rely on

After `normalizeSong` returns:

1. `schemaVersion === 2` and `source.sections` exists.
2. Every section, line, word, syllable, annotation, bar, and timing event that survives has a
   non-empty string id.
3. Every `ArrangementOccurrence.sourceSectionId` resolves to a section in `source.sections`.
4. Every `TechniqueAnnotation.syllableIds` entry resolves to a syllable on the same line, and
   no annotation has an empty `syllableIds` array.
5. `activeArrangementId` matches an existing arrangement; `arrangements.length >= 1`.
6. `1 <= repeatCount <= 32` for every occurrence.
7. `bassEnabled` is a boolean and `enabledParts` is non-empty.
8. If `mode === "advanced"`, every line has a `LineTiming` entry and no orphan timing remains.

## Line and song duplication

`duplicateLine` (`src/lib/songStorage.ts:482`) regenerates every nested id (line, words,
syllables, annotations, bars, events) and remaps references through maps, so editing the copy
cannot affect the original. `duplicateSong` (`:579`) does the same across sections, lines,
words, syllables, annotations, bars, events, arrangements, and occurrences, rewrites
`activeArrangementId`, appends `" Copy"` to the title, assigns a new song id, and resets
`createdAt`/`updatedAt`. The cloud `duplicateSong` reads the body then calls `createSong` with
the local copy (`src/lib/firebase/songs.ts:283`).

## Metadata documents

The body document holds the aggregate. The metadata document holds only what a dashboard card
needs:

```ts
SongMeta {
  id, title, artist?, key?, tempo?, mode,
  createdAt, updatedAt, createdBy, updatedBy,
  schemaVersion: 1,
  cardSummary?: {
    version: 2,
    modules: ("lyrics"|"vocalParts"|"arrangement"|"band"|"production")[],
    contributors: { total: number, preview: { uid, displayName, photoURL? }[] }
  }
}
```

`src/lib/firebase/types.ts:75`, `:34`. Note the two independent version numbers: the song
aggregate is `schemaVersion: 2`, the metadata document is `schemaVersion: 1` and the card
summary inside it is `version: 2` (`CARD_SUMMARY_VERSION` in `src/lib/firebase/songs.ts:57`).

`deriveSongModulePresence` (`src/lib/songSummary.ts:63`) adds `lyrics` when any syllable has
text, `vocalParts` when any SATB cue is non-empty, and `arrangement` when
`hasMeaningfulArrangement` is true (`src/lib/arrangement.ts:297`: repeats, explicit repeat
counts, cuts, occurrence notes, or a reorder relative to Source order). `band` and `production`
are never emitted.

## Drift from the Phase 3A document

The Phase 3A document (`docs/phase-3-source-arrangement-architecture.md`) predates Phase 3B-3D.
The code is authoritative. Differences:

| Phase 3A claim | Code reality |
| --- | --- |
| §R `Song` type has no `bassEnabled`, `voicePreset`, `enabledParts` | All three exist (`src/lib/songTypes.ts:178`-`:181`) and are derived in `normalizeSong` (`src/lib/songStorage.ts:391`) |
| §R `ArrangementOccurrence` has no `repeatCount` | `repeatCount?: number` exists (`src/lib/songTypes.ts:159`), clamped 1..32 |
| §R `WordToken` has no `syllabification` | Three-state field exists (`src/lib/songTypes.ts:103`) and drives Parts preparation |
| §R `ResolvedSection` has `occurrenceId` and `section` only | Also carries `occurrence`, `repeatIndex`, `renderIdentity` (`src/lib/arrangement.ts:15`) |
| §R resolver returns one row per occurrence | Expands `repeatCount` into multiple rows (`src/lib/arrangement.ts:79`) |
| §L migration guard is `!song.source` | Guard requires both `source` and `arrangements` to be present (`src/lib/arrangement.ts:266`) |
| §L default occurrences have no `repeatCount` | Migration writes `repeatCount: 1` (`src/lib/arrangement.ts:279`) |
| §E occurrence timing overrides reserved, not built | Still not built; the separate per-part `LineTiming.partOverrides` axis was built instead (see `ADR-0007`) |
| §N arrangement presence requires sequence mismatch or notes | Also counts explicit `repeatCount > 1` and section cuts (`src/lib/arrangement.ts:310`, `:315`, `:328`) |
| §F dual representation preserved "untouched" | Apply path writes annotations only, not `syllable.techniques` (`src/lib/annotationUtils.ts:313`) |

## Related

- Storage mapping: [backend/README.md](../backend/README.md)
- Resolution and rendering: [rendering-and-print.md](rendering-and-print.md)
- Migration decisions: [ADR-0004](../adr/ADR-0004-source-arrangement-model.md),
  [ADR-0005](../adr/ADR-0005-single-normalize-boundary.md)
