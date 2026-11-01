# Choirscript — Feature Inventory and Status

**Purpose:** one place that answers "does this exist?" without reading the whole repository. Every
row was checked against the code on 2026-11-01 at commit `b6eb796`; a claim without a file
reference is a claim you should re-verify.

**Status vocabulary** (used identically everywhere in `docs/`):

| Status | Meaning |
| --- | --- |
| **DONE** | Implemented, reachable by a user, and observed working in this repository or in production |
| **INCOMPLETE** | Code exists and is reachable, but a user-facing part of the feature is missing or deliberately simplified |
| **NOT STARTED** | No implementation; may be designed in these docs |
| **DEFERRED** | Explicitly postponed by the owner; do not build now |
| **SUPERSEDED** | Replaced by a newer decision; kept for history only |

The list of INCOMPLETE items is collected in [Round-up list](#round-up-list-incomplete-features)
at the end — that section is the one to work from when closing gaps.

---

## A. Identity and access

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| A-01 | Email/password + Google sign-in, password reset | **DONE** | `src/lib/firebase/auth.ts:257` (Google popup with redirect fallback), `:287` (email), `sendPasswordResetEmail` |
| A-02 | Client-side auth gating, redirect to `/login` | **DONE** | ADR-0001; `src/components/AppShell.tsx`, `src/lib/firebase/AuthContext.tsx` |
| A-03 | Deterministic default workspace `default-{uid}` | **DONE** | ADR-0010; `src/lib/firebase/workspace.ts` bootstrap path |
| A-04 | Display name edit | **DONE** | `workspace.ts:86`, `src/components/SettingsPage.tsx` |
| A-05 | Workspace rename | **DONE** | `workspace.ts:31` |
| A-06 | Membership documents with a `role` field | **INCOMPLETE** | `firestore.rules` defines `isWorkspaceMember` / `hasWorkspaceRole` and reads `role`; the app only ever writes `owner`. No invites, no role UI, no way to add a second member |
| A-07 | Account / workspace deletion | **NOT STARTED** | `firestore.rules` denies `delete` on `users/{uid}` and `workspaces/{id}` |
| A-08 | Multiple workspaces / organisation switching | **NOT STARTED** | One workspace per user; no switcher |
| A-09 | Server-verified sessions | **NOT STARTED** | Rules are enforced server-side; the app itself trusts the client session |

## B. Persistence

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| B-01 | Firestore as system of record, split song body + summary card | **DONE** | ADR-0002, ADR-0003; `src/lib/firebase/songs.ts` (`listSongs`, `getSongWithMeta`, `saveSong`) |
| B-02 | Single normalisation boundary + schema migration to v2 | **DONE** | ADR-0005; `normalizeSong` in `src/lib/songStorage.ts:861` lines total |
| B-03 | Legacy localStorage → Firestore import gate | **DONE** | `src/lib/firebase/migration.ts` (356 lines), `src/components/MigrationGate.tsx` |
| B-04 | Offline editing / conflict resolution | **NOT STARTED** | No offline cache, no vector clocks; last write wins |
| B-05 | Server-side validation of song bodies | **INCOMPLETE** | `/api/share` validates size and shape; Firestore writes are constrained only by rules |
| B-06 | Card-summary backfill for older songs | **DONE** | `songs.ts:331` `needsSummaryBackfill`, `:335` `backfillSongCardSummary` |

## C. Domain model (Source / Arrangement v2)

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| C-01 | Canonical Source sections; arrangements reference them by id | **DONE** | ADR-0004; `src/lib/songTypes.ts` (`SourceSection`, `ArrangementOccurrence`, `Arrangement`) |
| C-02 | Occurrence operations: append, remove, move, reorder, duplicate, repeat ×N, performer, voicing, melody part, note | **DONE** | `src/lib/arrangement.ts` exports (`appendOccurrence` … `setOccurrenceVoicing`); UI in `src/components/ArrangementEditor.tsx` (dnd-kit sortable) |
| C-03 | Arrangement resolution into a render sequence | **DONE** | `arrangement.ts:53` `resolveArrangement`, consumed by both rehearsal views and the shared page |
| C-04 | Multiple arrangements per song | **INCOMPLETE** | The model is an array with `activeArrangementId`, and `SongEditor` maps over it, but there is no UI to create, rename, duplicate or switch arrangements — every song carries exactly one |
| C-05 | Occurrence-level performance overrides (timing deltas, cues) | **NOT STARTED** | Reserved seam, documented in `songTypes.ts` comments; deliberately no fields |
| C-06 | Source sections reusable across songs (a source library) | **NOT STARTED** | Source lives inside each song document |
| C-07 | Referential integrity repair on load | **INCOMPLETE** | `normalizeSong` coerces shapes; orphaned timing/annotations are pruned on specific edit paths, not globally |
| C-08 | Section reorder within Source | **NOT STARTED** | Lines and sections can be duplicated and deleted; sections cannot be moved up/down (`songStorage.ts` has no `moveSection`) |

## D. Lyrics authoring

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| D-01 | Plain-text lyric paste with section-heading detection | **DONE** | `src/lib/lyricsParser.ts:44` `detectLyricsSectionHeading` (verse / chorus / bridge / pre-chorus / tag patterns) |
| D-02 | Pending words that Parts later prepares | **DONE** | `WordToken.syllabification: "pending" \| "auto" \| "manual"` |
| D-03 | Automatic syllabification: user dictionary → curated exceptions → hyphenation patterns | **DONE** | ADR-0008; `src/lib/syllableSplitter.ts` |
| D-04 | Manual split / merge / restore automatic / forget | **DONE** | word-edit popover; `applyWordSyllables` in `src/lib/lineText.ts` |
| D-05 | "Apply this split to every occurrence" | **DONE** | whole-song mode of `applyWordSyllables` plus a switch in the popover |
| D-06 | Learning dictionary across songs | **INCOMPLETE** | `src/lib/syllableDictionary.ts` writes to `localStorage` (`choirscript.syllableDictionary.v1`); per device, lost on cache clear, not visible to other users |
| D-07 | Line duplicate / delete, with timing + annotation remap | **DONE** | `songStorage.ts:493` `duplicateLine` (id maps for syllables, bars, occurrences) |
| D-08 | Section duplicate / delete / rename | **DONE** | `songStorage.ts:596` `duplicateSection`; `deleteSourceSectionWithOccurrences` in `arrangement.ts:316` |
| D-09 | Rich-markup lyric syntax (bold/italic/preview) | **NOT STARTED** | `RawMarkupPreview.tsx` exists but is never imported |

## E. Parts authoring

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| E-01 | SATB entry with single-key note aliases | **DONE** | `LyricLineBlock.tsx` → `VoicePartLanes.tsx` → `NotationInput.tsx`; `src/lib/notation.ts` (`Do Re Mi Fa So Ze La Ti`). Note `SyllableGrid.tsx` is dead code and is **not** the editable surface |
| E-02 | Voice presets: SATB / SAB / SSA / TTBB / unison / custom, per-part enable | **DONE** | `Song.voicePreset`, `Song.enabledParts`; `SongSettingsDialog.tsx` |
| E-03 | Technique annotations over syllable ranges, with intensity and note | **DONE** | `src/lib/annotationUtils.ts`; rendered as `TechniqueBadge`, created via `TechniqueContextMenu` from `DocumentScriptEditor.tsx` (`AnnotationInspector.tsx` is dead code) |
| E-04 | Per-syllable director note | **DONE** | `SyllableToken.directorNote`; rendered in both rehearsal views |
| E-05 | Slash-command insertion while typing a line | **DONE** | `src/lib/slashCommands.ts`, `SlashCommandLine.tsx`, `SlashCommandMenu.tsx` (cmdk) |
| E-06 | Copy a syllable's SATB onto neighbouring syllables | **DONE** | `src/lib/partTransfer.ts`, `PartTransferMenu.tsx` |
| E-07 | Octave marks, accidentals, altered degrees | **NOT STARTED** | The pitch model is eight diatonic names with no octave or accidental dimension |
| E-08 | Melisma — several notes on one syllable | **NOT STARTED** | One `string` per part per syllable |
| E-09 | Chord entry (whole-bar chords) | **NOT STARTED** | Not modelled anywhere |

## F. Timing engine

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| F-01 | Meters 4/4, 3/4, 6/8, custom; beat and half-beat subdivision | **DONE** | `src/lib/timing.ts:14` `DEFAULT_TIMING_SETTINGS`, `getUnitsPerBeat` |
| F-02 | Pickup bars | **DONE** | `SongTimingSettings.hasPickupBar`, `pickupBeats`; `getPickupBeatOptions` |
| F-03 | Bars per line, rebar, add/remove trailing bar | **DONE** | `timing.ts:176` `createBarsForLine`, `:282` `rebarLineTiming`, `:606` `addBarToLineTiming` |
| F-04 | Hold / rest / break events with editable durations | **DONE** | `timing.ts:414-426`; `AdvancedTimingLine.tsx` |
| F-05 | Shared timing with per-part overrides | **DONE** | ADR-0007; `partOverrides`, `createPartOverrideFromShared`, `resetPartOverride` |
| F-06 | Advanced timing editing surface | **DONE** | `src/components/AdvancedTimingLine.tsx` (477 lines) |
| F-07 | Quarter-beat and triplet subdivisions | **NOT STARTED** | `TimingSubdivision` is a two-value union |
| F-08 | Compound-meter grouping (6/8 felt in two) | **INCOMPLETE** | 6/8 is a preset; beat labels and bar units are computed as six plain beats, with no grouping/pulse model |
| F-09 | Structured tempo (numeric BPM, tempo map, changes) | **INCOMPLETE** | `Song.tempo` is a free string; the share payload also carries `bpm` as a string |
| F-10 | Timing integrity through duplicate / reorder / repeat | **INCOMPLETE** | Duplicate remaps bars and events correctly (`duplicateLine`); repeated occurrences share timing by design; there is no integrity check that catches edits made to a section's bars after occurrences were created |
| F-11 | Timing → notation derivation (barlines, dashes, commas) | **NOT STARTED** | See `../architecture/tonic-solfa-engine.md` |

## G. Rehearsal and rendering

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| G-01 | Simple rehearsal view (colour-coded lanes, note boxes) | **DONE** | `ColorfulRehearsalView.tsx` |
| G-02 | Advanced timing rehearsal view | **DONE** | `AdvancedTimingRehearsalView.tsx` |
| G-03 | Per-part visibility toggles | **DONE** | `RehearsalDisplayToggles`; `RehearsalView.tsx` switch list |
| G-04 | Lanes driven by content, not by the voice preset | **DONE** | commit `974fa80`; both views filter on whether the part has values |
| G-05 | Melody single-lane mode per occurrence | **DONE** | `ArrangementOccurrence.voicing` / `melodyPart` |
| G-06 | Performer labels per occurrence, with suggestions | **INCOMPLETE** | `ArrangementOccurrence.performer` is stored on the song; the suggestion list is `localStorage`-only (`src/lib/performerLabels.ts`) |
| G-07 | Arrangement rail, scroll-spy, mobile bar | **DONE** | `ArrangementRoadmap.tsx`, `ArrangementMobileBar` |
| G-08 | Mobile density pass | **DONE** | commit `8942c88`; 8 → 10 syllables visible per line at 390 px |
| G-08b | No horizontal scrolling on phones for long lines | **INCOMPLETE** | Long lines still scroll horizontally; the density pass reduced it, did not remove it |
| G-09 | Traditional tonic-solfa notation rendering | **NOT STARTED** | Rehearsal shows note-name chips only: no staff-like systems, bar lines, duration dashes, octave dots, commas |
| G-10 | "My Part" large-print focus mode | **NOT STARTED** | Only per-part toggles exist |
| G-11 | Lyrics-only rehearsal mode | **NOT STARTED** | — |
| G-12 | Saved view presets per user | **NOT STARTED** | Toggles reset on reload |
| G-13 | Print sheet | **INCOMPLETE** | `@media print` rules and `PrintToolbar.tsx` exist; output is the screen layout, not a sheet with systems, pagination and part alignment |
| G-14 | PDF export | **NOT STARTED** | Print-to-PDF via the browser only (ADR-0009) |
| G-15 | Practice audio, stems, mute/solo | **NOT STARTED** | Future module: `../future/ai-processing.md` |

## H. Sharing and publication

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| H-01 | Create a view-only share link `/s/{id}` | **DONE** | `ShareDialog.tsx`, `src/app/api/share/route.ts`, `src/app/s/[shareId]/page.tsx` |
| H-02 | Live link: republish on save, revision counter, in-place swap | **DONE** | ADR-0011; commit `783c338`; verified in production |
| H-03 | Push transport (Firestore doorbell) instead of polling | **DONE** | `src/lib/shareHeads.ts`; `firestore.rules` `shareHeads/{shareId}` |
| H-04 | Focus/visibility catch-up for a missed push | **DONE** | `SharedSongLive.tsx` `visibilitychange` handler |
| H-05 | Manual republish ("retry") button | **DONE** | `ShareDialog.tsx` `publishNow` — kept deliberately as the manual retry |
| H-06 | Links created before ADR-0011 stay frozen | **DONE** (by design) | No `.rev.json`, no token → `/rev` 404, `PUT` 403; documented in `../ledger/implementation-ledger.md` |
| H-07 | Accurate "Live" affordance on frozen links | **INCOMPLETE** | The shared page shows `Live` and `Updated …` for every link, including frozen ones. A one-line fix keyed on `/rev` 404 is designed but not implemented |
| H-08 | Unpublish / revoke / rotate a link | **NOT STARTED** | `allowOverwrite: false` on create, no delete path |
| H-09 | Expiry, password, domain-restricted links | **NOT STARTED** | Anyone with the id can read |
| H-10 | Server-side publish without a browser | **NOT STARTED** | The doorbell needs an authenticated client; a direct `PUT` does not ring it |
| H-11 | Canonical public pages (`/songs/{slug}`, `/creators/{handle}`) | **NOT STARTED** | See `../architecture/publication-and-seo.md` |
| H-12 | Visibility tiers: private / unlisted / public-indexable | **NOT STARTED** | Today's link is "unlisted by obscurity" only |
| H-13 | SEO surface (metadata, Open Graph, sitemap, robots, JSON-LD) | **INCOMPLETE** | Root `metadata` in `src/app/layout.tsx`; `/s/{id}` sets `openGraph`; no sitemap, no robots policy, no structured data |

## I. Collaboration

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| I-01 | Propose-edit / fork workflow | **NOT STARTED** | Design: `../architecture/contributions-and-revisions.md` |
| I-02 | Immutable revisions and musical diff | **NOT STARTED** | Only the editor's in-session undo stack |
| I-03 | Comments / review threads | **NOT STARTED** | — |
| I-04 | Real-time co-editing | **NOT STARTED** | Future; not a prerequisite for publishing |

## J. Editing shell and platform

| ID | Feature | Status | Evidence / notes |
| --- | --- | --- | --- |
| J-01 | Editor shell: nav (Lyrics · Parts · Advanced timing), import, settings, share | **DONE** | commit `3505315`; `EditorShell.tsx`, `EditorNav.tsx`, `SongSettingsDialog.tsx` |
| J-02 | Undo / redo with coalescing | **INCOMPLETE** | `src/lib/editorHistory.ts` (60 entries, in-memory); lost on reload, per-device only, no history UI beyond the buttons |
| J-03 | Autosave | **DONE** | 700 ms debounce (`AUTOSAVE_DEBOUNCE_MS`), then Firestore write |
| J-04 | Publish-on-save | **DONE** | 2 s debounce (`SHARE_PUBLISH_DEBOUNCE_MS`), then `PUT` + doorbell |
| J-05 | Resizable arrangement panel with persisted width | **DONE** | `usePanelWidth.ts`, `PanelResizeHandle.tsx`, `choirscript.panel.arrangement.v1` |
| J-06 | Keyboard shortcuts (undo/redo) | **DONE** | `useHistoryHotkeys.ts` |
| J-07 | Automated tests | **NOT STARTED** | No test runner, no test script in `package.json`, zero test files |
| J-08 | CI | **NOT STARTED** | No workflow files; `tsc`, `eslint`, `next build` are run by hand |
| J-09 | Firestore composite index configuration | **NOT STARTED** | No `firestore.indexes.json` in the repo; queries are shaped to avoid composite indexes |
| J-10 | Error observability | **NOT STARTED** | Failures surface in `console.error` and toasts; no reporting pipeline |
| J-11 | Abuse controls on `/api/share` | **NOT STARTED** | Unauthenticated POST, 1 MiB payload cap, no rate limiting |
| J-12 | Backups | **NOT STARTED** | Whatever Firestore provides by default; no export job |
| J-13 | Accessibility pass | **NOT STARTED** | No audit has been run; several icon-only controls lack labels |

## K. Future modules (documented, not started)

| ID | Area | Status | Document |
| --- | --- | --- | --- |
| K-01 | AI import, SATB separation, stems | **NOT STARTED** | `../future/ai-processing.md` |
| K-02 | Band / choir management | **NOT STARTED** | `../future/band-management.md` |
| K-03 | Creator marketplace | **DEFERRED** | `../future/marketplace.md` |
| K-04 | Public library and creator profiles | **NOT STARTED** | `../future/public-library.md` |
| K-05 | Subscription tiers and metering | **NOT STARTED** | `../product/tiers-and-monetization.md` |
| K-06 | Infrastructure migration (Neon, Drizzle, Better Auth, Cloudflare) | **NOT STARTED** | `../architecture/infrastructure-target.md` |

---

## Round-up list (INCOMPLETE features)

These are the features where code exists but the job is not finished. They are the cheapest
credible work items in the product, because each one starts from a working foundation.

| ID | Feature | What is missing | Rough size |
| --- | --- | --- | --- |
| A-06 | Workspace membership | Invite flow, role UI, acceptance, and enforcement in the app (rules already read `role`) | M |
| B-05 | Server-side validation | A schema check for `song` on publish and on save; today only size/shape on share | S |
| C-04 | Multiple arrangements | Create / rename / duplicate / switch / delete UI; `activeArrangementId` already drives rendering | M |
| C-07 | Referential integrity | A single `validateSong` pass that reports orphaned timing events, annotations and occurrences instead of repairing them incidentally | M |
| D-06 | Syllable dictionary | Move from `localStorage` to the user document or a table; merge on sign-in | M |
| F-08 | Compound meter grouping | A pulse/group model for 6/8 (and 12/8), used by beat labels and the future notation compiler | M |
| F-09 | Structured tempo | Numeric BPM, optional tempo change events, and `bpm` removed from the share payload's string form | S |
| F-10 | Timing integrity | Detect and repair timing whose bars no longer cover its events after edits | M |
| G-06 | Performer labels | Store suggestions on the user/workspace instead of device storage | S |
| G-08b | Phone line width | A wrap or fit strategy so a long line does not require horizontal scrolling | M |
| G-13 | Print sheet | Real sheet layout: systems, aligned SATB rows, page breaks, header/footer | L |
| H-07 | Honest live badge | Compare `/rev` and show `Snapshot` for frozen links | XS |
| H-13 | SEO baseline | `sitemap.xml`, `robots.txt`, canonical URLs, JSON-LD on the shared page | S |
| J-02 | Undo/redo durability | Persist the stack or scope it per arrangement; currently lost on reload | M |
| J-13 | Accessibility | Labels, focus order, contrast on technique colours | M |

Everything else that is not DONE is NOT STARTED or DEFERRED, and is designed in
`../architecture/` or `../future/`.

## Discrepancies with earlier documentation

- `docs/README.md` used to say sharing was immutable. Superseded by ADR-0011; the ledger records
  the change and ADR-0006 is marked superseded.
- `docs/phase-3-source-arrangement-architecture.md` describes occurrence-level overrides as
  "next phase". They still do not exist (C-05); the seam is reserved in `songTypes.ts`.
- Earlier planning assumed the syllable dictionary was already shared across devices. It is not
  (D-06).
- "Multiple arrangements" has been assumed in planning conversations as though it shipped with
  Source/Arrangement v2. The model shipped; the UI did not (C-04).
