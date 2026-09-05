# Phase 3A — Source + Arrangement Architecture

> **Status:** Accepted architecture checkpoint (design only — no runtime code changed).
> **Scope:** Defines how ChoirScript reconciles its existing single-aggregate `Song` model with
> the product model of canonical **Source** material and ordered **Arrangement** occurrences.
> **Implementation:** Phase 3B (separate effort, plan in §T).

---

## A. CURRENT MODEL FINDINGS

Verified against the codebase (not assumed):

### A.1 The Song aggregate (`src/lib/songTypes.ts`)

```ts
Song {
  id, title, artist?, key?, tempo?, notes?, mode: "simple"|"advanced",
  sections: SongSection[], timingSettings, timingByLine: Record<lineId, LineTiming>,
  createdAt, updatedAt
}
SongSection  { id, name, lines: SongLine[] }
SongLine     { id, words: WordToken[], annotations: TechniqueAnnotation[] }
WordToken    { id, originalWord, syllables: SyllableToken[] }
SyllableToken{ id, text, soprano, alto, tenor, bass?, techniques, directorNote? }
```

Everything — lyrics, notation, annotations, and all timing — lives in **one document**.

### A.2 Key structural facts that constrain the design

1. **Timing is keyed by `lineId`**, not stored in lines. `Song.timingByLine: Record<lineId, LineTiming>`
   where `LineTiming { lineId, bars[], sharedEvents[], partOverrides }`. Events reference
   syllables by `syllableId` and carry denormalized `sectionId`/`lineId`/`barId`. `ensureTimingForSong`
   (`timing.ts`) regenerates timing for lines that lack it and **drops timing for deleted lineIds**.
   → **Timing survives only as long as its lineId exists.** Any model that changes line identity
   across occurrences breaks timing silently.
2. **Annotations are dual-represented.** `syllable.techniques[]` (flattened, legacy shape) and
   `line.annotations[]` (canonical: `{ id, techniqueId, syllableIds[], appliesTo, note?, label?, createdAt }`).
   `normalizeSong()` (`songStorage.ts`) synthesizes annotations from syllable techniques when the
   array is empty and **prunes annotation syllableIds that no longer resolve**. Any edit path that
   removes syllables must prune both sides (`removeTechniqueFromSyllableIds` does).
3. **IDs are `prefix_uuid` strings** created by `createId()`. Sections/lines/words/syllables get IDs
   at creation time (`createLineFromText`, `createWordToken`, `createSyllableToken`).
4. **Duplication already has a known weakness:** `duplicateSong` (firebase/songs.ts) remaps section/
   line/word/syllable/annotation IDs via `syllableIdMap` but copies `timingByLine` **verbatim**
   (comment admits: "timingByLine references lineIds which are unchanged"). After duplication,
   timing references **stale line IDs from the source song**. `ensureTimingForSong` then repairs
   this by regenerating default timing — i.e., duplicated advanced-timing songs **lose their timing
   edits today**. Phase 3B must fix this class of bug, not repeat it.
5. **Simple vs advanced mode** (`Song.mode`): `DocumentScriptEditor` renders `LyricLineBlock` vs
   `AdvancedTimingLine` per line; `RehearsalView` picks `ColorfulRehearsalView` vs
   `AdvancedTimingRehearsalView`. Simple mode keeps `timingByLine` data "hidden but preserved"
   (DocumentScriptEditor copy). Mode is **presentation/feature-level**, not per-section.
6. **Rehearsal render identity:** `ColorfulRehearsalView` keys `section.id` and `line.id`;
   `AdvancedTimingRehearsalView` keys `line.id`, `bar.id`, `event.id`. **All current render keys
   assume section/line IDs are unique within a rendering.** Repeating a section in an arrangement
   would violate this unless render keys become composite.
7. **Metadata summary (Phase 2.3):** `cardSummary.modules` is presence-based
   (`lyrics`, `vocalParts`, `arrangement`, `band`, `production`), derived in `songSummary.ts` at
   save time. `arrangement` currently always derives `false`.
8. **Persistence:** `workspaces/{wid}/songs/{sid}` (metadata incl. `cardSummary`) +
   `document/current` (`{ schemaVersion: 1, song }`). Autosave = debounced whole-aggregate
   `setDoc` batch of both. `normalizeSong()` is the single canonical sanitize/migrate boundary,
   applied on every load and save.
9. **Share:** immutable `{ schemaVersion: 1, shareId, title, artist, key, bpm, song }` snapshots in
   Vercel Blob; `/s/[shareId]` renders `ColorfulRehearsalView`/`AdvancedTimingRehearsalView` directly
   from the snapshot's `song`.
10. **Editor mutation surface:** `SongEditor` owns ~15 mutation handlers; all operate via
    `updateSong(updater)` on the single `Song` object. Handlers are **section/line-ID based** and
    would keep working unchanged if the sections they mutate remain addressed by stable IDs.

---

## B. OWNERSHIP CLASSIFICATION

For each major existing field:

| Field | Class | Rationale |
|---|---|---|
| `title` | **A. Project** | Names the project as a whole. |
| `artist`, `key`, `tempo` (BPM) | **A. Project** | Song-level attribution/musical context; the card and share header already treat them as project-level. |
| `notes` (director notes, song-level) | **A. Project** | Free-text project context, not tied to any one section. |
| `mode` ("simple"/"advanced") | **A. Project** (kept) | Controls *which editor surface renders* — see §G. Not musical content. |
| `createdAt`/`updatedAt` | **A. Project** | Document lifecycle. |
| **Lyric text** (`SongLine.words[].syllables[].text`) | **B. Source** | Canonical words of the section. Arrangement re-sings them; it doesn't rewrite them. |
| **Word/syllable token structure** (`words[]`, `syllables[]`, IDs) | **B. Source** | The syllable token grid *is* the canonical content unit; timing and annotations address it by ID. |
| **SATB cues** (`soprano/alto/tenor/bass`) | **B. Source** | Canonical vocal notation for how the section is sung. |
| **Techniques / annotations** (both representations) | **B. Source** (default) | Markings describe the canonical way the part is taught/sung — see §F for the occurrence-exception question. |
| **`directorNote`** (per syllable) | **B. Source** | Canonical teaching note ("keep the vowel tall") — belongs to the part being taught. |
| **Section identity** (`SongSection.id`, `name`) | **B. Source** | The section *is* canonical material; its name/identity belong to Source. |
| **Simple-mode line content** (lyrics+SATB as rendered in simple mode) | **B. Source** | Simple mode is a *view* onto the same Source content (code already says "hidden but preserved"). |
| **`timingSettings`** (meter, subdivision, pickup) | **B. Source** | Canonical rhythmic frame the section's events are written against. Changing it re-bars every line (`rebarLineTiming`). |
| **`timingByLine`** (bars, shared events, per-part overrides) | **B. Source** — primary owner | Timing encodes "the canonical way this section is sung" (counts, holds, breaks). See §E for the arrangement-specific exception. |
| **Arrangement sequence** (which sections, what order, repeats) | **C. Arrangement** | Purely ordering/selection — this is what Arrangement *is*. |
| **Arrangement name** | **C. Arrangement** | e.g. "Sunday Set". |
| Per-occurrence **performance notes** | **D. Occurrence** (new, optional) | e.g. "half-time this time" — arrangement-context only, never mutates Source. |
| Per-occurrence **timing overrides** | **D. Occurrence** (new, narrowly-scoped, deferred) | See §E — designed in the type system now, not built/edited in 3B. |
| Card summary, save-status, `timingScope` UI state, selection state | **E. UI-only** | Derived/transient; never persisted as musical content. `cardSummary` is persisted but is *derived* data (recomputable), classification: project metadata. |

**Principle applied:** canonical musical content (what is sung) → Source. Sequence and
performance-context behavior (when/in what order/with what variation) → Arrangement.

---

## C. SOURCE MODEL

### C.1 Canonical sections

"Verse 1" **is** a canonical Source section. The minimum durable model keeps the existing
`SongSection` shape — freeform `name` — and adds a lightweight optional `type`:

```ts
type SourceSectionType =
  | "verse" | "chorus" | "bridge" | "intro" | "outro"
  | "preChorus" | "instrumental" | "custom";

type SourceSection = SongSection & {
  type?: SourceSectionType;   // default "custom"; used for grouping/UI affordances only
};
```

**Why freeform name + optional type (not structured type+number):**
- Existing data has only `name`; a `type`-plus-number scheme would force lossy inference
  ("Chorus 2" → type `chorus`, number 2? or distinct section?) — exactly the guesswork §O/L forbids.
- Nothing in the current UI needs typed structure; repeated choruses are handled by
  *occurrences referencing one section*, not by section numbering.
- `type` earns its place only as an eventual grouping/creation affordance ("+ Chorus" in the
  arrangement builder). Optional and defaultable = zero migration cost.

### C.2 What does NOT change in Source

`SongLine`, `WordToken`, `SyliableToken`, `TechniqueAnnotation`, `LineTiming`, `Bar`,
`TimingEvent`, `SongTimingSettings` — all **UNCHANGED** types, relocated under `source`.
The entire syllable/token engine (`annotationUtils`, `timing.ts`, `syllableSplitter`,
`songSelection`, `notation`) continues to operate on the same objects.

---

## D. ARRANGEMENT MODEL

```ts
type ArrangementOccurrence = {
  id: string;                 // unique placement identity (createId("occ"))
  sourceSectionId: string;    // REQUIRED reference into source.sections
  note?: string;              // occurrence-local performance note (D-class)
  // Timing/lyric/SATB/technique overrides: deliberately NOT in Phase 3B.
  // Type system reserves the seam (see §E); no fields shipped.
};

type Arrangement = {
  id: string;                 // createId("arr")
  name: string;               // "Sunday Set", "Full Set" — display only
  occurrences: ArrangementOccurrence[];  // ORDER = performance order
};

type SongArrangements = {
  activeArrangementId: string;           // which arrangement rehearsal renders
  arrangements: Arrangement[];           // structurally supports many; UI exposes one in 3B
};
```

Resolution of the mandated questions, conservatively:

| Question | Decision | Why |
|---|---|---|
| Occurrence identity | Own `id` (unique per placement) | Two occurrences of the same Chorus are distinct placements; render keys and future modules address placements. |
| Ordering | Array position in `occurrences[]` | Simplest, matches how `sections[]` already encodes order; drag-reorder = array reorder. No separate `order` field (redundant + drift-prone). |
| `sourceSectionId` | Required, validated | An occurrence without one is meaningless. Normalization drops occurrences with unresolvable references (never silently keeps danglers — §L). |
| Labels | **No** | The card/section name comes from Source; occurrence labels would fork naming. The optional `note` covers "this one is different" text. |
| Enabled/disabled state | **No** | Removing an occurrence *is* disabling. A boolean invites contradictory states. |
| Can repeat | **Yes** — the entire point | Same `sourceSectionId` any number of times. |
| Local notes | **Yes** (optional, new) | Real arrangement need ("final chorus — a cappella last line"), belongs to the placement, never mutates Source. |
| Timing overrides | **Deferred** — reserved, not built | See §E. |
| Lyrics/SATB/technique overrides | **No** | Would fork canonical content; contradicts the core promise ("editing the canonical Chorus updates every occurrence"). Rejected. |

---

## E. TIMING DECISION (the hard part)

**Chosen: Model A — Source owns canonical timing; occurrences may later carry narrowly-scoped,
explicitly-typed timing overrides. Model B (all timing in occurrences) is rejected.**

Defense from the actual engine:

1. **Timing is content-coupled, not performance-coupled, today.** `TimingEvent.syllableId` points at
   a specific syllable; `sharedEvents`/`partOverrides` are authored *against* the section's token
   grid. If timing moved to occurrences, every occurrence of every section would need a full copy
   of events — recreating the exact duplication the arrangement model exists to eliminate, and
   making a Source lyric edit (which changes syllable count) orphan timing in *every* occurrence
   simultaneously. Source-ownership keeps the existing edit-coupling intact: editing a line's
   lyrics re-bars that line in one place (`ensureTimingForSong`), exactly as today.
2. **The rehearsed unit is the section.** Directors time a Chorus once; the arrangement decides how
   many times it occurs. Model B would make "how do we sing the Chorus" an arrangement question —
   it isn't; "how many times and in what order" is.
3. **The legitimate arrangement-specific case (final chorus half-time / held ending) is real but
   rare and *derivable as a delta* from canonical timing.** That's precisely what an override is.
   Model C "another structure" has no better seam than a per-occurrence override map.

**The reserved seam (typed now, built later):**

```ts
// NOT constructed or edited in Phase 3B. Shape reserved so later phases don't
// migrate the Arrangement type again.
type OccurrenceTimingOverride = {
  // Narrow, targeted deltas — never a full LineTiming copy:
  // e.g. stretch/compress factor per section, extra ending hold (event-level
  // deltas keyed by canonical event id). Exact shape = future phase's job.
};
```

Phase 3B ships **no override fields on `ArrangementOccurrence`**; rendering uses canonical timing
for every occurrence. The reason to *reserve* rather than add later: adding fields to a Firestore
doc is cheap, but retrofitting "occurrences may override timing" into renderer/normalizer
invariants is the expensive part — the type comment marks the seam so it isn't forgotten.

**Consequence for repeated occurrences:** the Chorus occurs 3×, each rendering the *same*
canonical `timingByLine` entries. That is correct behavior (identical counts), with the override
seam as the future escape hatch.

---

## F. TECHNIQUE / ANNOTATION DECISION

- **Techniques/annotations are canonical (Source-owned).** A crescendo on "grace" belongs to the
  part. The final-chorus-different-dynamics case is an *occurrence-context* concern; if it ever
  needs support it arrives as the same class of narrowly-scoped occurrence override as timing
  (§E) — **not** as occurrence-level annotation copies. 3B ships none.
- **Dual-representation invariant is preserved untouched.** Both `syllable.techniques[]` and
  `line.annotations[]` move into Source *as-is*; `normalizeSong()`'s synthesis/pruning logic
  continues to run on Source sections exactly as it does today on `song.sections`. Migration
  (§L) performs **no annotation rewriting** — it relocates arrays wholesale, so no annotations
  are lost or silently re-derived.
- **Director notes** (`syllable.directorNote`): Source-owned, same reasoning (canonical teaching
  content). The new occurrence-level `note` is the arrangement-context counterpart.

---

## G. SIMPLE / ADVANCED DECISION

**Keep `Song.mode` unchanged (project-level), do not move it.** Reasoning from the code:
`mode` selects which *editor surface* (`LyricLineBlock` vs `AdvancedTimingLine`) and which
*rehearsal renderer* (`Colorful…` vs `AdvancedTiming…`) renders — it is a presentation/feature
toggle over the same data, already documented as "Simple mode keeps this data hidden but
preserved." Moving it into Source would wrongly suggest the *content* differs by mode; moving it
into Arrangement would force per-arrangement mode with no current meaning. Renaming/replacing
the concept buys nothing and risks churn across ~10 components. Cheapest correct choice: keep.

---

## H. DEFAULT + MULTIPLE ARRANGEMENT STRATEGY

**Structurally support multiple arrangements; expose exactly one in Phase 3B.**

- `Song.arrangements: Arrangement[]` + `activeArrangementId` — schema supports many from day one.
- Locking to a single `Arrangement` object (not array) would force a schema migration + data move
  the first time "Concert arrangement" is wanted; the array costs nothing now (one element).
- 3B UI: create/edit only the default arrangement; no switcher. `activeArrangementId` points at it.

**Default arrangement creation & lifecycle:**

- **New songs:** `createEmptySong()` creates one `Arrangement` (id, name `"Default"`), empty
  `occurrences[]`, `activeArrangementId` → it.
- **New Source sections** are appended to `source.sections` **and** appended as an occurrence to
  every arrangement? **No — to the active arrangement only**, preserving "Source may contain
  sections unused in an arrangement" as a first-class state (e.g. a verse cut from the set).
  Current UX continuity: today adding a line/section makes it appear in the script; mapping that
  to "appears in the active arrangement" preserves behavior.
- **Source section deleted:** occurrences referencing it are **deleted with it** (cascade), never
  left dangling. `normalizeSong()` additionally drops any dangling occurrence it finds (defense in
  depth) — silent danglers are forbidden. UI: deleting a Source section that is placed N times
  must warn "this removes N placements from the arrangement."
- **Occurrence removed:** removes only the placement; Source section always survives.

---

## I. EDITOR UX

Editor IA evolves as prepared in Phase 2.1:

```
EDIT
- Source        (existing document editor, retitled)
- Arrangement   (new view)
```

- **Source view = the existing `DocumentScriptEditor` operating on `song.source.sections`.**
  Answers "what are the canonical parts?" It keeps everything that works today: title/metadata,
  mode toggle, import, syllable grid, technique menus, timing tools. No redesign of its internals.
- **Arrangement view** answers "in what order are we performing them?":
  - Ordered list of occurrence cards: position, section name (live from Source), Source type
    badge if set, occurrence note indicator.
  - **Reorder:** drag-and-drop (or ↑/↓ keyboard buttons as the accessible baseline; dnd is an
    enhancement, not a dependency).
  - **Add occurrence:** pick from existing Source sections ("+ add Chorus again") — the repeat
    workflow; plus "new section" which creates Source + appends occurrence.
  - **Remove occurrence:** removes the placement only. Must be visually/verbally distinct from
    "delete Source section," which lives in the Source view and carries the cascade warning (§H).
  - **Edit Source from an occurrence:** clicking an occurrence's section name jumps to Source view
    scrolled/highlighted to that section. Editing there edits canonical content — never forks.
  - Occurrence `note`: inline editable; presence shown as a small marker on the occurrence card.

---

## J. REHEARSAL RESOLUTION

New pure resolver (domain layer, unit-testable):

```ts
function resolveArrangement(song: Song): ResolvedSection[] {
  const arrangement = getActiveArrangement(song);          // activeArrangementId, fallback first
  return arrangement.occurrences
    .map(occ => ({ occurrence: occ, section: song.source.sections.find(s => s.id === occ.sourceSectionId) }))
    .filter(valid);
}
// ResolvedSection { occurrenceId, section: SourceSection }
```

- **Rendering:** rehearsal iterates `ResolvedSection[]` instead of `song.sections`.
- **Repeated sections:** the *same* `section.id` appears multiple times → **render keys MUST be
  composite**:
  - `ColorfulRehearsalView`: `key={occurrenceId}` on `<section>`, `key={`${occurrenceId}:${line.id}`}`
    on lines, `key={`${occurrenceId}:${flat.id}`}` on syllables.
  - `AdvancedTimingRehearsalView`: `key={`${occurrenceId}:${bar.id}`}`, `key={`${occurrenceId}:${event.id}`}`.
- **DOM IDs:** none of the current components emit DOM `id` attributes from data IDs (verified);
  the no-collision requirement is therefore satisfied by React keys alone. Rule going forward:
  any new DOM id/anchor must prefix with `occurrenceId`.
- **No arrangement exists / empty occurrences:** fall back to Source order (sections as they are),
  which is also the migration-mapped default (§L) — so post-migration rendering is byte-identical
  to today's behavior.
- **Print:** same resolution; print CSS is renderer-level and unaffected.
- **Advanced timing:** per occurrence, use the section's canonical `timingByLine` as today; the
  only change is composite keys + passing resolved sections.

---

## K. IDENTITY MODEL

**Canonical, immutable-stable IDs (unchanged semantics):**
`song.id`, `sourceSection.id`, `line.id`, `word.id`, `syllable.id`, `annotation.id`,
`timing event.id`, `bar.id` — all keep their `createId` provenance and are referenced exactly as
today *within* Source.

**New identity:**
- `arrangement.id` — stable per arrangement.
- `occurrence.id` — unique per placement; stable across reorders (reordering must NOT regenerate
  occurrence IDs, or future Band/Production cues attached to placements would orphan).

**Composite render identity:** for a repeated Chorus, `sectionId`/`lineId`/`syllableId` recur.
Render identity = **`occurrenceId + <inner id>`** (e.g. `${occ.id}:${line.id}`). This is a *view*
concept: no duplicated lines are ever generated, no IDs rewritten, `timingByLine` stays keyed by
canonical `lineId`. The resolver's `ResolvedSection` carries `occurrenceId` alongside the
canonical `section` precisely so render layers can build these keys. Any future data structure
that must address "a specific placement" (Band cue on final Chorus) uses `occurrenceId`; anything
addressing "the musical part" uses `sourceSectionId`/`lineId`.

---

## L. EXISTING SONG MIGRATION

**Chosen baseline: 1 existing section → 1 canonical Source section; default arrangement
references them in existing order. No content merging of any kind.**

"Songs like Verse 1 / Chorus / Verse 2 / Chorus 2" are ambiguous by nature — "Chorus 2" may be a
variant, a copy, or an intentional distinct section. Name/text similarity cannot prove identity,
so **data preservation beats deduplication**: users consolidate duplicates intentionally in the
Arrangement/Source UI later (delete the redundant Source section after re-pointing placements —
a guided, explicit action, not a heuristic).

**Mechanics (inside `normalizeSong()`, the existing canonical boundary):**

```ts
// schemaVersion on the Song aggregate: 1 → 2
if (!song.source) {                       // pre-Phase-3 song (schemaVersion 1)
  song.source = {
    sections: song.sections,              // MOVED by reference — zero content rewrite
  };
  const defaultArrangement: Arrangement = {
    id: createId("arr"), name: "Default",
    occurrences: song.source.sections.map(s => ({ id: createId("occ"), sourceSectionId: s.id })),
  };
  song.arrangements = [defaultArrangement];
  song.activeArrangementId = defaultArrangement.id;
}
song.schemaVersion = 2;                   // then existing per-section normalization runs
```

- **Deterministic, idempotent:** guarded by `!song.source` + `schemaVersion`; re-running on an
  already-migrated song is a no-op. Never merges, never reorders, never renames.
- **`normalizeSong` continues** to run its existing section/line/syllable/annotation/timing repair
  *on `song.source.sections`* — the migrate boundary stays single.
- **Firestore:** no separate migration job. Migration happens lazily on first load (editor,
  rehearsal, share-render normalize path) and is persisted by the next autosave. Optionally, the
  Phase 2.3-style versioned backfill can proactively migrate + bump metadata, but lazy migration
  alone is sufficient and cheapest.
- **Local/share snapshot compatibility:** old `schemaVersion: 1` payloads (localStorage backup
  keys, Vercel Blob shares) run through the same `normalizeSong` → migrate on load. **Old share
  links keep working forever**: schemaVersion-1 share snapshots are migrated in-memory at render;
  they are not rewritten in Blob (immutability preserved).
- **Rollback:** code rollback is safe — schemaVersion 2 documents contain all schemaVersion 1
  content (sections array is fully preserved inside `source.sections`; old code that reads
  `song.sections` would simply see it missing, so a rollback shim would read `song.source?.sections ?? song.sections`).
- **Deletion behavior** (§H) is part of normalization, not just UI.

---

## M. FIRESTORE STORAGE DECISION

**Chosen: Option A — keep Source + Arrangement inside the single Song aggregate in
`document/current` for Phase 3. Do NOT split into subcollections now.**

- Editor needs Source + active arrangement together on every load; one aggregate = one read pair
  (meta+body), unchanged from today's cost model.
- Autosave writes the whole aggregate atomically — no cross-document consistency to manage.
- No new collection → **no Firestore rules changes** (explicit non-goal), no new index, no cost
  increase, no partial-write failure modes.
- Phase 2.3 metadata-only card loading is untouched; `cardSummary` derivation still runs in the
  repository at save.
- Realtime collaboration later will likely force per-entity documents anyway (granular writes);
  splitting *then* is a deliberate, informed migration. Splitting *now* buys nothing except
  distributed-document complexity (two-doc transactions for every autosave) precisely when the
  data model is still settling. Subcollections are rejected "merely because the domain has
  multiple concepts."

---

## N. CARD-SUMMARY SEMANTICS

`"arrangement"` becomes present when the project contains **meaningful Arrangement-module usage**,
defined as:

> The active arrangement resolves to a sequence that is **not merely the default Source order** —
> i.e. `arrangements.length > 0` **and** the active arrangement has occurrences **and** (occurrence
> count ≠ source section count **or** the occurrence→section sequence differs from
> `source.sections` order **or** any occurrence carries an occurrence-level note).

This matches the card promise ("this project contains content in this module"): a freshly
migrated song (arrangement = mirror of Source order) has *no* arrangement *work* in it yet — its
card correctly shows lyrics/vocalParts only. The moment a director actually *arranges* (reorder,
repeat, cut a section, annotate an occurrence), `arrangement` appears. Derivation lives in
`songSummary.ts` next to the other presence rules and runs in the repository at save.

---

## O. SHARING COMPATIBILITY

- **Snapshot payload gains a version bump:** `SharedSongPayload.schemaVersion: 1 → 2`, embedding
  the migrated Song aggregate (Source + arrangements). `/s/[shareId]` renders via
  `resolveArrangement()` on the snapshot's song.
- **Old links never break:** schemaVersion-1 snapshots are detected and normalized
  (`normalizeSong`) in-memory at render — same lazy migration path as §L. The Blob object is
  **never rewritten** (immutability preserved; `allowOverwrite: false` untouched).
- `createSharedSong` writes schemaVersion 2 with the current aggregate — no redesign, no live
  sharing, no R2.

---

## P. DUPLICATION

`duplicateSong` must remap **all** identity, not just part of it:

1. New `song.id`; new `createdAt`/`updatedAt`; title suffix " Copy".
2. **Source:** remap `section.id` (newMap), then `line.id`, `word.id`, `syllable.id`,
   `annotation.id` (existing `syllableIdMap` logic extended with a section map and a line map).
3. **Timing:** rebuild `timingByLine` under the **new line IDs** — every `LineTiming.lineId`,
   every `TimingEvent.{sectionId,lineId,barId}` re-pointed; bars get new IDs. **This must also fix
   the pre-existing weakness** where duplication copies `timingByLine` verbatim against stale
   line IDs (verified in firebase/songs.ts) — Phase 3B implements duplication against the new
   model correctly, which subsumes and closes that bug (advanced-timing songs will finally
   duplicate with timing intact).
4. **Arrangements:** new `arrangement.id` + new `occurrence.id`s; `sourceSectionId` remapped
   through the section map; **order preserved**.
5. `cardSummary` recomputed (not copied) via the repository's normal create path.

---

## Q. FUTURE COLLABORATION / BAND / PRODUCTION COMPATIBILITY

- **Collaboration:** stable canonical IDs (section/line/syllable/annotation/bar/event unchanged
  from today) + placement-stable `occurrence.id` give CRDT/OT systems the stable addresses they
  need. The single-aggregate doc is the main future constraint (whole-doc writes), but Phase 3A
  explicitly accepts that (§M) — splitting later is a storage migration, whereas *unstable IDs*
  would be an unfixable data problem. Source edits vs arrangement reorder are naturally disjoint
  address spaces (section/line IDs vs occurrence IDs) → low merge-conflict surface.
- **Band:** cues plausibly attach per **occurrence** (the brass plays the final Chorus only) →
  `occurrenceId` is the anchor; section-level charts → `sourceSectionId`. Both addresses exist in
  the schema from 3B. No Band structures are created now.
- **Production:** same pattern (per-occurrence production notes/cues vs per-section stems) —
  both addresses available. No Production structures created now.

---

## R. FINAL TYPES

Labels: **[UNCHANGED]** existing type, untouched · **[MOVED]** relocated without shape change ·
**[NEW]** introduced in Phase 3B · **[DEPRECATED]** removed/replaced.

```ts
// ── Project level ─────────────────────────────────────────────
type Song = {
  id: string;
  title: string; artist?: string; key?: string; tempo?: string; notes?: string;
  mode: SongMode;                          // [UNCHANGED] (see §G)
  source: SongSource;                      // [NEW] replaces top-level sections
  arrangements: Arrangement[];             // [NEW]
  activeArrangementId: string;             // [NEW]
  timingSettings: SongTimingSettings;      // [MOVED→ source? NO — stays project-level]
                                           // rationale: meter is the song's frame; Source
                                           // sections are timed against it. Kept at Song level
                                           // to avoid re-barring semantics churn.
  createdAt: string; updatedAt: string;
  schemaVersion: 2;                        // [CHANGED] 1 → 2
};
// sections: SongSection[]  → [DEPRECATED at top level; content lives in source.sections]

type SongSource = {
  sections: SourceSection[];               // [MOVED] from Song.sections (same element type + new field)
};

// ── Source level ──────────────────────────────────────────────
type SourceSectionType =                   // [NEW] optional, default "custom"
  | "verse" | "chorus" | "bridge" | "intro" | "outro"
  | "preChorus" | "instrumental" | "custom";

type SourceSection = SongSection & {       // [MOVED + extended]
  type?: SourceSectionType;
};
// SongSection, SongLine, WordToken, SyllableToken, TechniqueAnnotation,
// AppliedTechnique          → [UNCHANGED] (relocated under source.sections)
// SongTimingSettings, LineTiming, Bar, TimingEvent, TimingScope,
// TimingEventType           → [UNCHANGED] (Song.timingSettings / timingByLine keep their
//                              Song-level home; they address source lines by canonical lineId)

// ── Arrangement level ─────────────────────────────────────────
type ArrangementOccurrence = {             // [NEW]
  id: string;                              // unique per placement — stable across reorders
  sourceSectionId: string;                 // required, validated
  note?: string;                           // occurrence-local performance note
  // timing/lyric/SATB/technique overrides: deliberately absent in 3B (seam documented §E)
};

type Arrangement = {                       // [NEW]
  id: string;
  name: string;
  occurrences: ArrangementOccurrence[];    // array order = performance order
};

// ── Render layer (not persisted) ─────────────────────────────
type ResolvedSection = {                   // [NEW] output of resolveArrangement()
  occurrenceId: string;
  section: SourceSection;
};

// ── Metadata (Phase 2.3, unchanged shape) ────────────────────
// SongMeta.cardSummary.modules              → [UNCHANGED] "arrangement" now derivable (§N)
```

Everything else in the codebase (annotations utilities, timing engine, splitter, notation,
selection) consumes these types unchanged.

---

## S. BEFORE / AFTER EXAMPLE

**BEFORE — schemaVersion 1 (today):**

```ts
song.sections:
  1 { id: "sec_A1", name: "Verse 1",  lines: [...] }
  2 { id: "sec_B1", name: "Chorus",   lines: [...] }
  3 { id: "sec_A2", name: "Verse 2",  lines: [...] }
  4 { id: "sec_B2", name: "Chorus 2", lines: [...] }   // ambiguous: variant? duplicate?
song.timingByLine: { "<lineId>": LineTiming, ... }      // keyed across all sections
```

**AFTER — deterministic migration (schemaVersion 2):** every existing section becomes canonical;
default arrangement mirrors existing order. Content is byte-identical; nothing merged.

```ts
song.source.sections:
  [ { id: "sec_A1", name: "Verse 1",  type: undefined, lines: [...] },   // unchanged object
    { id: "sec_B1", name: "Chorus",   lines: [...] },
    { id: "sec_A2", name: "Verse 2",  lines: [...] },
    { id: "sec_B2", name: "Chorus 2", lines: [...] } ]                   // preserved as-is

song.arrangements:
  [ { id: "arr_1", name: "Default", occurrences: [
      { id: "occ_1", sourceSectionId: "sec_A1" },
      { id: "occ_2", sourceSectionId: "sec_B1" },
      { id: "occ_3", sourceSectionId: "sec_A2" },
      { id: "occ_4", sourceSectionId: "sec_B2" } ] } ]
song.activeArrangementId: "arr_1"
song.timingByLine: { ...unchanged, still keyed by the same lineIds... }
```

**IDEAL NEW SONG — one canonical Chorus referenced twice:**

```ts
song.source.sections:
  [ { id: "sec_v1", name: "Verse 1",  type: "verse",  lines: [...] },
    { id: "sec_ch", name: "Chorus",   type: "chorus", lines: [...],   // ONE canonical Chorus
      ... } ,
    { id: "sec_v2", name: "Verse 2",  type: "verse",  lines: [...] },
    { id: "sec_br", name: "Bridge",   type: "bridge", lines: [...] } ]

song.arrangements:
  [ { id: "arr_x", name: "Default", occurrences: [
      { id: "occ_i",  sourceSectionId: "sec_ch", note: undefined },    // Intro chorus
      { id: "occ_ii", sourceSectionId: "sec_v1" },
      { id: "occ_iii",sourceSectionId: "sec_ch" },
      { id: "occ_iv", sourceSectionId: "sec_v2" },
      { id: "occ_v",  sourceSectionId: "sec_ch", note: "A cappella last line" },
      { id: "occ_vi", sourceSectionId: "sec_br" },
      { id: "occ_vii",sourceSectionId: "sec_ch" } ] } ]

// Rehearsal renders 7 sections; the Chorus content exists ONCE.
// Render keys: occ_iii:sec_ch etc. — no collisions.
// Edit sec_ch once → all four occurrences update. Timing edits in timingByLine
// under sec_ch's lineIds apply to every occurrence (until future overrides).
```

---

## T. PHASE 3B IMPLEMENTATION PLAN

Order derived from dependencies; each step is a compiling, runnable checkpoint:

1. **Types + schema constants** — add all §R types; `Song.schemaVersion = 2`; keep old
   `sections` field temporarily optional on the internal type for migration reads.
2. **Migration in `normalizeSong()`** — §L transform (guarded, idempotent). *Checkpoint: app
   compiles and runs; old songs migrate on load; editor still renders from sections via a
   temporary accessor (`getEditableSections(song) => song.source?.sections ?? song.sections`).*
3. **Accessors/resolver** — `getActiveArrangement`, `resolveArrangement`,
   `getEditableSections`, cascade-delete helpers. *Checkpoint: editor + rehearsal both render
   through the resolver; existing songs render identically to pre-migration.*
4. **Editor: Source view** — point `DocumentScriptEditor`/`SongEditor` mutation handlers at
   `source.sections`; add Source-section `type` editing (optional); add the "delete section also
   removes N placements" warning. *Checkpoint: full editing parity.*
5. **Editor: Arrangement view** — occurrence list, reorder (arrows first), add-occurrence picker,
   remove-occurrence, occurrence note, jump-to-Source. New `arrangement` editor mode in the
   EDIT sidebar group.
6. **Persistence** — `createSong`/`saveSong` stamp schemaVersion 2; no rules/index changes;
   metadata `cardSummary` gains the §N arrangement rule.
7. **Duplication** — full remap per §P (closes the legacy timing-duplication weakness).
8. **Rehearsal + share rendering** — composite keys in both rehearsal views; resolver-based
   rendering; schemaVersion-2 share writes; v1 snapshot compat read.
9. **Card summary backfill** — extend the Phase 2.3 versioned backfill to recompute summaries
   (so existing songs pick up the new `arrangement` semantics without body reads where the
   summary already exists — recompute only when arrangement-related inputs changed is NOT
   detectable from metadata, so: bump `cardSummary.version` → one-time re-backfill from body,
   same cost model as Phase 2.3).
10. **Validation** — migration fixtures (single-section, already-repeated names, empty song,
    advanced-timing song), duplication round-trip, share round-trip v1→v2, cost checks.

---

## U. RISK REGISTER

**HIGH**

- **Timing references (lineId-keyed) break under identity changes** — any accidental line-ID
  regeneration orphans `timingByLine` (today's duplicateSong bug is exactly this). *Mitigation:*
  Source lines keep canonical IDs through migration by reference (no regeneration); duplication
  implements the full timing remap (§P.3) with a fixture that duplicates an advanced-timing song
  and asserts event/`syllableId` integrity.
- **Annotation dual representation silently diverging during migration** — normalization already
  synthesizes/prunes; relocating arrays wholesale (no rewriting) keeps both sides consistent.
  *Mitigation:* migration performs zero annotation edits; post-migration invariant check
  (every annotation syllableId resolves) in dev builds.
- **Repeated-occurrence render key collisions** — duplicate React keys for the 2nd Chorus would
  corrupt lists/timing UI. *Mitigation:* composite `occurrenceId:` keys mandated in §J for both
  rehearsal views + any DOM ids; lint-time grep checklist in 3B review.
- **Autosave racing migration** — a debounced save of a not-yet-normalized v1 aggregate could
  persist pre-migration shape. *Mitigation:* `normalizeSong` runs inside the load path *before*
  state is set (already the pattern); `saveSong` re-normalizes on write (already does).

**MEDIUM**

- **Duplicated legacy sections ("Chorus 2")** — users may expect auto-merge. *Mitigation:* §L
  baseline (no merging) + a deliberate "consolidate duplicates" affordance in the Arrangement UI
  (delete redundant Source section after re-pointing) rather than heuristics.
- **Duplication remap complexity grows** (sections+lines+words+syllables+annotations+timing+
  occurrences). *Mitigation:* single `remapSongIds()` utility with an ID-map type; round-trip
  test: duplicate → assert reference integrity (every occurrence resolves; every timing event's
  syllableId exists).
- **Share v1 → v2 rendering drift** — old shares must look identical. *Mitigation:* v1 payloads
  normalize via the same migration; snapshot fixture test asserting resolved output equality
  pre/post migration for the same content.
- **Card-summary backfill cost on 3B deploy** — bumping summary version forces one body read per
  song, once. *Mitigation:* same session-deduped, non-fatal pattern as Phase 2.3; acceptable
  one-time cost.

**LOW**

- `SourceSectionType` misuse (freeform names still primary) — type is optional/ungrouped for now.
- Occurrence notes abused as lyrics forks — they're plain notes; overrides were explicitly rejected.
- Mode confusion post-rename of views — `Song.mode` untouched; only sidebar labels change.

---

*End of Phase 3A architecture document.*
