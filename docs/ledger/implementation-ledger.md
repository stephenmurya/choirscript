# Implementation ledger

This is the delivery record for ChoirScript: every commit on `master`, in order, with what it
actually delivered and what remains unverified. It is reconstructed from `git log`,
`git show --stat`, and reading the current source. Commit subjects are not trusted on their own;
where a subject under-describes the diff, the diff wins.

Verification legend used below:

- **Verified** — the code path or file exists in the current tree and was read while writing
  this ledger.
- **Verified (diff)** — the change was confirmed from the commit diff itself.
- **Unverified** — plausible from the subject or the surviving code, but not proven by reading
  the commit diff or by running the app.
- **Absent** — confirmed not to exist in the repository.

Environment facts at the time of writing: branch `master`, 22 commits, first commit 2026-07-08,
last commit `a79c7b1` 2026-10-31. No CI configuration (`.github` absent), no test runner in
`package.json`, no `*.test.*` or `*.spec.*` files.

## Commit inventory

| Date | SHA | Subject | Files | Delivered (verified) |
| --- | --- | --- | --- | --- |
| 2026-07-08 | `ee0e87c` | Initial commit from Create Next App | 19 | Next.js scaffold, default `src/app/page.tsx`, `globals.css`, lint/ts config, create-next-app README |
| 2026-07-08 | `cbfbd46` | Update: Responsiveness, tightned up CSS | 44 | The first real domain layer: `songStorage.ts`, `songTypes.ts`, `annotationUtils.ts`, `defaultTechniques.ts`, `notation.ts`, `songSelection.ts`, `syllableSplitter.ts`, plus a large component set (diff stats: 4917 insertions) |
| 2026-07-09 | `72b4279` | Fix: CSS issues with short lines of lyrics | 5 | Grid rework of `ColorfulRehearsalView`, `LyricLineBlock`, `VoicePartLanes` for short lyric lines |
| 2026-07-09 | `6b54ac2` | Fix: Massive UI overhaul | 64 | Added the 716-line `src/lib/timing.ts`, expanded `songTypes`, added shadcn-style UI primitives (switch, tabs, textarea, toggle, tooltip), 9160 insertions total |
| 2026-07-10 | `d8dbf1d` | Fix: Minor contrast issues, Update: Added shareable links | 18 | First share pipeline: `src/app/api/share/route.ts`, `src/lib/share-store.ts`, `/s/[shareId]` page, `ShareDialog`, `SharedPageActions`, `SharedSongPayload` type |
| 2026-09-05 | `8d5d1c7` | choirscript v2 implementation | 22 | Cloud persistence and auth: `firestore.rules` (137 lines), `firebase.json`, `src/lib/firebase/{client,auth,songs,types,migration}.ts`, `AuthContext`, `AuthGate`, `MigrationGate`, `LoginPage`, `/login` route (3221 insertions) |
| 2026-09-05 | `699c7ff` | deployment | 1 | `.firebaserc` with project alias `choirscript-d2651` (Firebase CLI target only) |
| 2026-09-05 | `36a6898` | auth issue fix | 2 | Firestore rules adjustment (5 lines) plus 51 lines in `src/lib/firebase/auth.ts` — the bootstrap/profile area |
| 2026-09-05 | `f1e971b` | popup blocker fix | 3 | Popup-blocked handling in `LoginPage`, `auth.ts`, and a new sync accessor in `client.ts` (the user-activation fix) |
| 2026-09-05 | `eb232ef` | fix: google sign in errors | 7 | Auth error handling plus 70 changed lines of Blob diagnostics in `api/share/route.ts` and 24 in `share-store.ts`; share creation error reporting was built in this "google sign in" commit |
| 2026-09-05 | `96f3a45` | workspace shell implementation | 19 | `(workspace)` route group layout, `WorkspaceHomePage`, `SettingsPage`, `WorkspaceSongsContext`, `workspace.ts`; also `SongsLibraryPage` and `RecentSongsPage`, both later deleted |
| 2026-09-05 | `d90f81b` | Phase 2.1: workspace/editor UX refinement | 16 | Deleted `SongsLibraryPage` and `RecentSongsPage` (−344 lines), reworked `WorkspaceHomePage` (+406/-…), added `songActions.ts`; `/songs` and `/songs/recent` became redirects |
| 2026-09-05 | `803c832` | Phase 2.2: restore workspace card grid, fix song interaction bugs | 1 | `WorkspaceHomePage` only, 162 insertions / 160 deletions — card grid and interaction fixes |
| 2026-09-05 | `535165d` | Phase 2.3: song card summary model + final card design | 6 | `src/lib/songSummary.ts` added, `SongMeta`/`SongCardSummary` expanded, `songs.ts` gained the backfill path (133 changed lines), context and card redesign |
| 2026-09-05 | `4367096` | Polish song card layout | 1 | `WorkspaceHomePage` layout polish only |
| 2026-09-05 | `c93c194` | Phase 3A: define Source and Arrangement architecture | 1 | `docs/phase-3-source-arrangement-architecture.md`, 701 lines at that commit (731 today) |
| 2026-09-06 | `c91b24a` | Phase 3B: implement Source and Arrangement model | 19 | `src/lib/arrangement.ts` (263 lines), schemaVersion 2 migration in `songStorage.ts` (343 changed lines), `ArrangementEditor`, resolver consumption in both rehearsal views, `scripts/phase3-validation.ts` |
| 2026-09-06 | `7436825` | Phase 3C: build Lyrics and Parts editor surfaces | 23 | Lyrics/Parts split (`PlainLyricsEditor` added, `EditorShell` reworked: 308 changed lines), `ArrangementRoadmap`, `ConfirmDialog`, `lyricsParser.ts`, `slashCommands.ts` |
| 2026-09-06 | `6d4c7e3` | Phase 3D: stabilize editor UX and lyric workflow | 21 | `src/lib/lineText.ts` added (122 lines), `EditorInspector` added, `PlainLyricsEditor` added (146 lines), `scripts/phase3d-validation.ts`, custom `hyphen` typings |
| 2026-09-07 | `8c829a7` | Phase 3D: refine editor and rehearsal workflows | 24 | `ImportReviewDialog`, roadmap rework (42 changed lines), `RehearsalView` rework (44 changed lines), `SongEditor` (187 changed lines), `songSelection` (31 changed lines), `lyricsParser` suspicious-line detection |
| 2026-10-24 | `8c68463` | added legal pages | 8 | `/privacy`, `/terms`, `LegalPage`, login-page legal links; **also** the same-origin `/__/auth/*` rewrite in `next.config.ts` and auth/client adjustments |
| 2026-10-31 | `a79c7b1` | fix: keep rehearsal view mounted by using a valid rootMargin | 1 | `ArrangementRoadmap` scroll-spy fixed: `-5rem` -> `-80px` and `try/catch` around `IntersectionObserver` construction |
| 2026-10-31 | `e920af4` | feat(editor): syllable splits with a device dictionary and part transfer | 12 | `syllableDictionary.ts`, rewritten `syllableSplitter.ts`, `applyWordSyllables` in `lineText.ts`, split panel in `LyricLineBlock`, `partTransfer.ts` + `PartTransferMenu`, 3-dot word affordance |
| 2026-10-31 | `3466e1e` | docs: syllable splitting, part transfer, rehearsal responsiveness | 3 | Ledger + architecture updates for the above |
| 2026-10-31 | `eabea13` | fix(rehearsal): keep long lines reachable on mobile and drop empty part lanes | 5 | `LineScroll` scroll port with edge fade + Swipe hint, empty-lane suppression, 3-dot containment in `LyricLineBlock` |
| 2026-10-31 | `6916c4a` | feat(editor): performer labels, melody/harmony voicing, section duplication, undo/redo | 14 | `ArrangementOccurrence.performer` + `performerLabels.ts`, `voicing`/`melodyPart` + single-lane melody rendering, `duplicateSection`, `editorHistory.ts` + `useHistoryHotkeys`, `overflow-x: clip` sticky fix |
| 2026-10-31 | `3505315` | feat(editor): remove the left sidebar; nav owns import, settings and timing mode | 12 | `EditorShell`/`EditorNav` tabs (`lyrics`/`parts`/`advanced`), `SongSettingsDialog`, header import icon + hidden file input, deleted `EditorInspector`, `LyricsImporter`, `ModeToggle`, resizable arrangement panel (`usePanelWidth`, `PanelResizeHandle`) |
| 2026-10-31 | `310b39f` | fix(rehearsal): opaque header on the shared rehearsal page | 1 | `bg-background` instead of 90% + blur |
| 2026-10-31 | `974fa80` | fix(rehearsal): part lanes follow content, not the voice preset | 3 | Lane rows no longer gated by `toggles.enabledParts` in either rehearsal view; snapshot-date badge on the shared page |
| 2026-10-31 | `29d85f6` | feat(share): live share links with in-place refresh; tighter mobile rehearsal | 15 | Mutable share head + `.rev.json` + `editToken`, `SharedSongLive`, publish-on-save, ADR-0011, CSS density vars |
| 2026-10-31 | `8942c88` | fix(rehearsal): fit more syllables per line on phones | 2 | Note box `h-9 w-10` → `h-7 w-8`, lane chip `h-7` → `h-6`, `--syllable-pad 0.125rem`, `--line-col-gap 0.125rem`, `--line-col gap 0.125rem` |
| 2026-10-31 | `783c338` | feat(share): push live updates over a Firestore doorbell instead of polling | 8 | `shareHeads` rules + `shareHeads.ts`, `publishShareHead` wiring, `SharedSongLive` subscription, 3 s poll removed, ADR-0011/ledger rewritten |

Everything below the table is now committed — the earlier "uncommitted working tree" note in this
document was accurate on the morning of 2026-10-31 and is superseded by the rows above.

## Phase narrative

### Phase 0 — scaffold (2026-07-08, `ee0e87c`)

Create-next-app output only. The default README and default page shipped from here; the README
was never replaced (`README.md` is still boilerplate, 36 lines). `AGENTS.md` and `CLAUDE.md`
were added in the same commit and carry only a Next.js version warning.

### Phase 1 — local-first prototype (2026-07-08 to 2026-07-10)

`cbfbd46` is the real starting point of the product despite its CSS-sounding subject: it
introduced the domain modules that still exist. `6b54ac2` added the timing engine. At this
stage songs lived in `localStorage`, seeded with a demo song (`createSampleSong`,
`src/lib/songStorage.ts:172`), and the share pipeline already existed (`d8dbf1d`).

Verified in the current tree: the localStorage helpers survive but are no longer used by any UI
path (`loadSongs`/`saveSongs` are unreferenced outside `songStorage.ts`). The demo-seeding
behavior is therefore dormant, and the comment in `src/lib/firebase/migration.ts:118` still
refers to it.

Unverified: whether the pre-cloud share pipeline stored to the same Blob path or a different
one; `d8dbf1d` predates `schemaVersion` 2 and the payload was reshaped later.

### Phase 2 — cloud persistence, auth, workspace shell (2026-09-05)

`8d5d1c7` is the largest single change: 3221 insertions across 22 files. It introduced the
Firestore model, security rules, the bootstrap flow, and both gates. The following four commits
are a single day of production fixing:

- `36a6898` touched rules and `auth.ts` — consistent with the `defaultWorkspaceId` create
  constraint and the self-healing pointer.
- `f1e971b` introduced the synchronous Auth accessor and popup-blocked fallback, which is still
  the shape of `src/lib/firebase/client.ts:63`-`:97` and
  `src/lib/firebase/auth.ts:257`-`:285`.
- `eb232ef` is where share-creation diagnostics were built, not auth: the route gained the
  `logBlobError`/`diagnosticCodeFromError` path now at `src/app/api/share/route.ts:24`-`:73`.

`96f3a45` added the workspace group and the home page. Its `SongsLibraryPage` and
`RecentSongsPage` were deleted one commit later in `d90f81b`, which is why `/songs` and
`/songs/recent` exist today only as redirect stubs.

`535165d` established the metadata/card-summary split that makes the dashboard cheap: the
`SongCardSummary` type (`version: 2`) and `deriveSongModulePresence` live there. The backfill
path for pre-2.3 songs is in the same commit.

Unverified: whether any production songs still lacked a card summary at the time; the backfill
code exists precisely for that case and is exercised on every workspace load
(`src/components/WorkspaceSongsContext.tsx:79`).

### Phase 3 — Source and Arrangement (2026-09-05 to 2026-09-07)

- `c93c194` wrote the design first (701 lines), which is why the document is unusually specific
  and also why it drifts from what was later built.
- `c91b24a` implemented the model: new types, `arrangement.ts`, the normalizer migration, and
  the arrangement editor. `scripts/phase3-validation.ts` (146 lines) was added as a manual
  assertion script — not a test suite.
- `7436825` split the editor into Lyrics and Parts surfaces, added the roadmap and confirm
  dialogs, and added lyrics parsing for pasted text with headings.
- `6d4c7e3` added `lineText.ts` (LCS reconciliation of lyric edits) and the inspector.
- `8c829a7` refined import review, the roadmap, and rehearsal loading, and added suspicious-line
  detection for scraped lyrics.

Evidence the Phase 3 model is live: `resolveArrangement` is used by both rehearsal renderers and
by the roadmap; `repeatCount` is editable in `ArrangementEditor` and clamped in
`normalizeSong`; the v1->v2 migration is guarded and idempotent
(`src/lib/arrangement.ts:265`).

Not delivered despite the design: multiple visible arrangements (the schema has an array and
`activeArrangementId`, but there is no switcher), occurrence-level timing overrides, and
occurrence-level annotations.

### Phase 4 — legal pages (2026-10-24, `8c68463`)

Public `/privacy` and `/terms` pages, a shared `LegalPage` component, and legal links on the
login page. The commit also contains `next.config.ts`'s `/__/auth/*` rewrite and changes in
`src/lib/firebase/client.ts` and `auth.ts` — the same-origin redirect fix. This is a case where
the subject hides the most operationally significant change in the commit.

Unverified: whether the legal copy was reviewed; the pages are static text and nothing in the
repo records a review.

### Phase 5 — rehearsal outage fix (2026-10-31, `a79c7b1`)

Symptom: rehearsal mode and shared `/s/<id>` links died with Next.js "This page couldn't load".

Root cause: `ArrangementRoadmap` constructed an `IntersectionObserver` with
`rootMargin: "-5rem 0px -65% 0px"`. `rootMargin` accepts only px and percentages, so the
constructor threw a `SyntaxError` inside a `useEffect`. The throw escaped the effect and
unmounted the tree, which the App Router surfaced as the error page.

Fix: `rootMargin` is now `-80px 0px -65% 0px`, and construction is wrapped in `try/catch` so a
future invalid option degrades to a missing scroll-spy instead of a blank page
(`src/components/ArrangementRoadmap.tsx:20`-`:33`).

Unverified: no regression test was added, and nothing prevents a future `rem` value in that
option. Verification today is code inspection plus the commit.

## Editor shell restructure (2026-10-31)

`3505315`. The left sidebar is gone. `EditorShell` now owns a sticky header holding: the import
icon (`FileUp` opens the OS picker, the file feeds the existing review dialog), the settings icon
(`SongSettingsDialog` with title/artist/key/BPM/director notes plus voice preset and part
switches), undo/redo, share, and the `EditorNav` tabs.

- `EditorNav` renders `lyrics | parts | advanced` twice — a segmented control on desktop and a
  full-width row on mobile — and both are the same component, so the two cannot drift. "Advanced"
  sets `song.mode = "advanced"`; the other two set it back to `"simple"`. Simple timing is the
  default because `activeNav` derives from `song.mode` and `?view=`.
- Deleted `EditorInspector.tsx`, `LyricsImporter.tsx`, `ModeToggle.tsx`. The first two were the
  entire left column; nothing referenced them afterwards.
- The arrangement panel is resizable (`usePanelWidth` + `PanelResizeHandle`), width driven by a
  `--arrange-width` custom property on `.editor-columns`, persisted per device, with the previous
  fixed width as the minimum (22rem, max 40rem). Double-clicking the handle resets it.
- **Three CSS bugs were found during this work and are worth remembering:**
  1. `html, body { overflow-x: hidden }` silently breaks `position: sticky` everywhere, because it
     turns the body into a scroll container. `overflow-x: clip` contains the overflow without that
     side effect. This is why the nav bar would not stick even though it already had `sticky`.
  2. An **unlayered** `button, input, textarea, select { font: inherit }` rule beat every Tailwind
     `text-*` utility, so form controls rendered at 16px inside 11px controls — the arrangement
     fields "did not fit" for months. Unlayered author CSS outranks all Tailwind layers. The rule
     was deleted (preflight already sets `font: inherit` inside `@layer base`).
  3. The real width driver on phones was the note box (`h-9 w-10`, fixed 40px) — shrinking the
     word cells changed nothing until it went to `h-7 w-8`.

## Live share links and mobile rehearsal density

Delivered after `974fa80`. Recorded in [ADR-0011](../adr/ADR-0011-live-share-links.md), which
supersedes ADR-0006.

- **Shares are mutable.** `put()` for `shares/<id>.json` now uses `allowOverwrite: true`; the editor
  republishes 2 s after the last change (`SHARE_PUBLISH_DEBOUNCE_MS` in
  `src/components/SongEditor.tsx`). The song document carries `share: { id, editToken, publishedAt }`
  so any signed-in device can republish (`normalizeSong` preserves it; the public payload strips it).
- **Editing needs the token.** `shares/<id>.key.json` stores it; `publishSharedSong` compares before
  writing and the route answers 403 otherwise.
- **Polls are cheap.** `shares/<id>.rev.json` is `{ revision, updatedAt }`; `SharedSongLive` polls
  `/api/share/<id>/rev` every 3 s, pauses on hidden tabs, checks again on `visibilitychange`, and only
  fetches the payload when the revision moved. The swap is in place — no reload, scroll preserved.
- **Push replaced the poll.** The editor writes `shareHeads/<id>` (`{ shareId, revision, updatedAt }`)
  after a publish commits — `publishShareHead` in `src/lib/shareHeads.ts`, called from
  `publishShare()` in `SongEditor`, from `ShareDialog` at creation and from "publish now". Viewers
  hold one `onSnapshot` via `subscribeShareHead`; the 3 s interval is gone. Focus/visibility still
  triggers a single `/rev` catch-up for tabs that were asleep when the write landed. `firestore.rules`
  allows `get` on `shareHeads/{id}` without auth and requires a signed-in editor to write; `list` and
  `delete` are denied. The document is advisory — the Blob payload stays authoritative, so a bogus
  head costs one wasted fetch. The Firestore SDK is imported dynamically inside `subscribeShareHead`
  so it stays out of the route's first-load bundle.
- **Part lanes follow content.** `ReadOnlyVoiceLanes` and the advanced view's row filter no longer
  consult `toggles.enabledParts`: a part with values on the line always renders. Before this, a
  song whose `voicePreset` was `unison` (or whose saved `enabledParts` list omitted a part) drew
  lyrics with zero lanes — the "parts don't show" report. The per-part switches in rehearsal still
  hide a lane deliberately; the preset no longer does it silently.
- **No CDN staleness.** `getSharedSong` reads with `useCache: false`; both API routes are
  `force-dynamic` and answer `cache-control: no-store`.
- **Copy changed.** The "changes to the original song do not update this link" paragraph and the
  snapshot-date badge are gone, replaced by a `Live` badge and an "Updated …" stamp. The dialog says
  the link follows the song.
- **Mobile density.** `.line-block` on `max-width: 640px` now sets `--line-label-col: 1.5rem`,
  `--syllable-col-min: 1.625rem`, `--syllable-pad: 0.125rem`, `--syllable-min-h: 1.625rem`,
  `--line-col-gap: 0.125rem`, and `--timing-unit-width: 2.25rem`; the part-lane chip is `h-6 w-6` on
  phones and the note box `h-7 w-8` (was `h-9 w-10`). Type size is unchanged — the space between
  boxes is what shrank, so lines fit a phone portrait without rotating.

Unverified: republishing from the editor was not exercised against a signed-in session (no
credentials in this environment); the API create/publish/poll path and the in-place swap were
exercised directly, and the server-side token check was read rather than attacked. The doorbell rules
were exercised against the Firestore/Auth emulators (anonymous read allowed, anonymous write denied,
workspace paths still denied, authenticated write pushed to a live listener) but not against the
deployed project. No test suite exists to lock any of this down.

## Unverified across the whole project

These are not phase-specific; they are things no artifact in the repository proves.

| Area | Status |
| --- | --- |
| Automated tests | **Absent.** `package.json` has no `test` script; no test files exist. `scripts/phase3-validation.ts` and `scripts/phase3d-validation.ts` are `node:assert` scripts that must be run manually with a TS runner; nothing invokes them. |
| CI | **Absent.** No `.github/`, no other CI config. |
| Type checking in CI | **Absent.** `npx tsc --noEmit` is the only check and is manual. |
| Lint in CI | **Absent.** `npm run lint` exists but nothing runs it automatically. |
| End-to-end auth flows | **Unverified.** Google popup, redirect fallback, password reset, and bootstrap failure recovery are only proven by code and past fixes. |
| Firestore rules behavior | **Unverified.** No emulator config and no rules tests; the rules' first-bootstrap path in particular is only reasoned about in comments. |
| Share creation against a real Blob store | **Unverified** in this environment: no Blob credentials are committed, and the failure diagnostics exist because this has failed before. |
| Print output | **Unverified.** No snapshot test, no headless print check; pagination depends on the browser. |
| Mobile layouts | **Unverified.** Responsive classes exist; nothing records device testing. |
| Data migration at scale | **Unverified.** The lazy v1->v2 migration and the localStorage import have no test fixtures beyond the manual scripts. |
| Accessibility | **Unverified.** Labels and `aria-*` attributes exist in places; no audit is recorded. |

## Known gaps recorded during this documentation pass

1. `.gitignore:34` ignores `.env*`, which also ignores `.env.example`. The template is on disk
   but untracked, so a fresh clone has no environment template.
2. `.env.example` omits the Blob variables that `src/lib/share-store.ts` needs, so local share
   testing cannot be configured from the template alone.
3. 12 components are unreferenced (list in
   [../architecture/core-editor.md](../architecture/core-editor.md#where-the-ux-actually-hurts-verified-observations)
   and [README.md](../README.md#known-gaps-at-a-glance)). The live editing chain is
   `SongEditor → DocumentScriptEditor → LyricLineBlock → VoicePartLanes → NotationInput`.
4. The editor and rehearsal routes are outside `AuthGate`; signed-out deep links render a
   permanent loading state ([routing-and-state.md](../architecture/routing-and-state.md#known-gaps)).
5. No unsaved-changes guard exists; a navigation within the 700 ms autosave window loses the edit.
6. `applyTechniqueToSyllables` does not write `syllable.techniques`, so the technique legend can
   disagree with the rendered annotations ([data-model.md](../architecture/data-model.md)).
7. `README.md` is create-next-app boilerplate and describes a different project structure
   (`app/page.tsx`), which no longer matches this repository.
8. The Phase 3A document is stale in at least the ways catalogued in
   [data-model.md](../architecture/data-model.md#drift-from-the-phase-3a-document) and
   [rendering-and-print.md](../architecture/rendering-and-print.md#drift-from-the-phase-3a-document).

## Documentation foundation pass (2026-11-01)

**No application code changed in this pass.** It is a documentation-only audit and plan, produced
against commit `b6eb796`. Every "DONE" claim was checked against the code, not against earlier
summaries; three statements that had been repeated in planning turned out to be false and are now
recorded as such:

- Multiple arrangements do **not** exist in the UI (the model only).
- Sections cannot be reordered.
- `SyllableGrid` is dead code — SATB entry runs through `VoicePartLanes` → `NotationInput`.

Created: `product/` (vision, features, user-roles, tiers), `architecture/` (current-state,
domain-model, core-editor, tonic-solfa-engine, auth-and-ownership, publication-and-seo,
contributions-and-revisions, infrastructure-target, migration-plan, asset-rights-and-storage),
`future/` (ai-processing, band-management, public-library, marketplace), `planning/`
(pre-migration-improvements, implementation-roadmap, dependency-map, risks-and-open-questions,
decision-log). Updated: `README.md` (index, source of truth, status vocabulary, gaps),
`future/README.md` (real statuses), this ledger.

Verified while writing: 44 markdown files under `docs/`, **0 broken internal links**; working tree
contained only documentation changes; `tsc`, `eslint` and `next build` untouched because no source
file was modified.

Unverified by nature: everything marked NOT STARTED. The TIER/PHASE estimates in
`planning/implementation-roadmap.md` are judgement, not measurements.

## Related

- Planned work: [../future/README.md](../future/README.md)
- Decision records: [../adr/](../adr/)
- Feature status: [../product/features.md](../product/features.md)
