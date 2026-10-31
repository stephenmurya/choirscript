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

Uncommitted working tree on 2026-10-31 (as read at 09:15; not part of any commit):

- `src/lib/syllableDictionary.ts` added: localStorage dictionary (`lookupSyllables`,
  `rememberSyllables`, `forgetSyllables`), apply-scope preference get/set/subscribe.
- `src/lib/syllableSplitter.ts` modified: Unicode `WORD_PATTERN`, curated `EXCEPTIONS`,
  dictionary-first precedence, `splitWordIntoSyllablesWithPatterns`, `applyPieces`,
  `splitManualSyllables` accepting `- – — / · •`, `wordEdges`, `countWordLetters`.
- `src/lib/lineText.ts` modified: Unicode word surface handling, safer unmatched-surface path,
  `applyWordSyllables(song, target, pieces, { everywhere, syllabification })`.
- `src/lib/partTransfer.ts` added: pure `move`/`swap` transfer helpers for line, section, and
  song scope; rewrites part strings only, leaving timing and annotations untouched.
- `src/components/PartTransferMenu.tsx` added: line/section/song scoped menu over enabled parts.
  Not imported by any rendered component at the time of reading.
- `src/components/LyricLineBlock.tsx` modified: word split panel with live preview, dictionary
  write on save, "Forget saved split", "apply to every occurrence" switch, hover affordance on
  words of at least three letters.
- `src/components/SongEditor.tsx` modified: syllable edits routed through `applyWordSyllables`
  with options, instead of the previous in-place syllable mapping.

Status of that work: not committed, not covered by automated tests, and not verified in a
browser during this documentation pass. Parts of it are reachable if the dev server is run from
this working tree, which is exactly why it is recorded separately from shipped phases.

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
- **No CDN staleness.** `getSharedSong` reads with `useCache: false`; both API routes are
  `force-dynamic` and answer `cache-control: no-store`.
- **Copy changed.** The "changes to the original song do not update this link" paragraph and the
  snapshot-date badge are gone, replaced by a `Live` badge and an "Updated …" stamp. The dialog says
  the link follows the song.
- **Mobile density.** `.line-block` on `max-width: 640px` now sets `--line-label-col: 1.75rem`,
  `--syllable-col-min: 1.9rem`, `--syllable-pad: 0.25rem`, `--syllable-min-h: 1.75rem`,
  `--line-col-gap: 0.1875rem`, and `--timing-unit-width: 2.25rem`; the part-lane chip is `h-7 w-7`.
  Type size is unchanged — the space between boxes is what shrank, so lines fit a phone portrait
  without rotating.

Unverified: republishing from the editor was not exercised against a signed-in session (no
credentials in this environment); the API create/publish/poll path and the in-place swap were
exercised directly, and the server-side token check was read rather than attacked. No test suite
exists to lock any of this down.

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
3. 11 components are unreferenced (list in
   [../architecture/overview.md](../architecture/overview.md#dead-code)).
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

## Related

- Planned work: [../future/README.md](../future/README.md)
- Decision records: [../adr/](../adr/)
