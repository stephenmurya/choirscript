# Architecture — Core Editor

**Purpose:** how editing works today, and the seams that must be opened for the pre-migration
improvements. Read `current-state.md` first for the map; this document is about the editing
pipeline and its constraints.

## The editing pipeline

```text
pointer/keyboard
   │
   ▼
panel callback (e.g. syllable note change)
   │
   ▼
updateSong(mutator)                     ← SongEditor.tsx
   ├─ recordHistory(previous)           ← 60-entry in-memory stack, 500 ms coalescing
   ├─ normalise + set state             ← optimistic, immediate
   ├─ 700 ms debounce ──► saveSong()    ← Firestore document/current + summary card
   └─ song.updatedAt changes
        └─ 2000 ms debounce ──► PUT /api/share/{id} (only if song.share exists)
                                   └─► doorbell write
```

Consequences worth knowing:

- **Every mutation funnels through one function.** That is why undo, autosave and publishing are
  coherent — and why the file is 1,183 lines.
- **History is per editor session.** Reloading loses it. It is not scoped per arrangement or per
  line, and 500 ms coalescing means a fast burst of keystrokes is one undo step.
- **Publishing cannot run ahead of the save.** The publish effect keys off `song.updatedAt`, so a
  failed save also means no publish (correct) and a slow save delays the link (accepted).

## Editing surfaces

| Surface | Component chain | Notes |
| --- | --- | --- |
| Lyrics and parts (the main column) | `SongEditor` → `DocumentScriptEditor.tsx` → `LyricLineBlock.tsx` (499 lines) → `VoicePartLanes.tsx` → `NotationInput.tsx` | Pending words until Parts processes them; the 3-dot affordance beside words > 2–3 letters opens the split editor |
| Plain lyric import | `PlainLyricsEditor.tsx`, `src/lib/lyricsParser.ts` | Section headings detected, not required |
| Techniques | `TechniqueContextMenu.tsx` (opened from `DocumentScriptEditor`) → `TechniqueBadge.tsx`; logic in `src/lib/annotationUtils.ts` | Range selection across syllables, per-part application |
| Timing | `AdvancedTimingLine.tsx` (477 lines) → `TimingEventBlock.tsx` / `TimingEventPopover.tsx`; `TimingSettingsPopover.tsx`, `TimingScopeSelector.tsx` | Bars, events, shared-vs-part scope switch |
| Arrangement | `ArrangementEditor.tsx` (515 lines) | dnd-kit sortable occurrences, performer/voicing/repeat/note |
| Settings | `SongSettingsDialog.tsx` | Title, artist, key, BPM, director notes, voice preset, part switches |
| Import | header `FileUp` → review dialog | Plain text and JSON |

**Dead surfaces — do not extend them.** `SyllableGrid.tsx`, `SyllableCell.tsx`,
`AnnotationInspector.tsx`, `SelectedSyllableInspector.tsx`, `SelectableSyllableText.tsx`,
`SectionList.tsx`, `MetadataPanel.tsx`, `RawMarkupPreview.tsx`, `SongDashboard.tsx`,
`TechniquePalette.tsx`, `VoicePartCueInput.tsx`, `FloatingTechniqueToolbar.tsx` are never
imported. Editing work belongs in the live chain above, or in a new component that replaces it
wholesale.

## Where the UX actually hurts (verified observations)

1. **SATB entry is keyboard-hostile.** A note per syllable per part means dozens of keystrokes;
   the 3-dot word affordance is small on touch, and there is no "fill from previous" beyond
   `partTransfer`.
2. **The word/syllable editor competes with the line editor.** Two different affordances open
   popovers over the same token; the boundary is not obvious to a new user.
3. **Sections cannot be reordered.** They can be duplicated and deleted; moving one means
   recreating it (C-08).
4. **There is no arrangement switcher** (C-04), so the arrangements panel reads as "the order",
   not "one of several".
5. **Phones still scroll horizontally on long lines** (G-08b) — the density work helped, the
   problem is not solved.
6. **Failure is quiet.** A failed save or publish logs to the console; the only visible signal is
   the absence of a change.

## Pre-migration work that belongs here

Ordered by user value per unit of risk (full list in `../planning/pre-migration-improvements.md`):

| Work | Why now | Depends on |
| --- | --- | --- |
| Extract `useSongEditor` from `SongEditor` | Unblocks tests and every later feature without behaviour change | None |
| Split `SongEditor` mutations into a reducer | History becomes testable; enables revision diffs later | Above |
| Section reorder | Small, obvious, removes a workaround users hit weekly | None |
| Arrangement switcher | The model already supports it | None |
| Melisma + octave/accidental model | Largest musical gap; blocks the notation compiler | Domain decision |
| Notation compiler | The product promise in Rehearsal | Melisma + octave model |
| Print sheet | Depends on the compiler for systems and pagination | Compiler |

## Constraints to respect while doing it

- Do not move persistence or publishing logic into components; they are the parts that must stay
  swappable when the backend changes.
- Keep `normalizeSong` as the only repair boundary. New fields get defaults there, not in
  consumers.
- Any new mutation must preserve ids, and must remap dependent timing/annotations when it creates
  or removes syllables — `duplicateLine` is the reference implementation.
- Do not introduce a state library to "solve" `SongEditor`; a reducer plus hooks is enough and
  keeps the migration path clean.
