# Architecture overview

## What the application is

ChoirScript is a web app for choir directors who teach by ear. A director keeps a library of
songs in a personal workspace; each song contains lyric sections, four-part notation cues per
syllable, technique annotations, optional director notes, and an optional bar-level timing
grid. A song can be rehearsed in a read-only performance view, printed, or published as an
immutable read-only link.

The product surface that actually exists in code:

- Email/Google sign-in, a profile document, one default workspace per user.
- A workspace home page listing song metadata cards, with create, duplicate, delete, share,
  and open actions (`src/components/WorkspaceHomePage.tsx:345` onward).
- Two editor surfaces per song: a plain lyric/Document editor and a Parts editor
  (`src/components/SongEditor.tsx:95`, `src/components/DocumentScriptEditor.tsx:246`).
- A Parts arrangement panel: reorder placements, add/remove occurrences, repeat counts,
  occurrence notes (`src/components/ArrangementEditor.tsx`).
- Rehearsal rendering in two modes: color-first simple view and bar-grid advanced timing view
  (`src/components/ColorfulRehearsalView.tsx`, `src/components/AdvancedTimingRehearsalView.tsx`).
- Browser print with a black-and-white print variant (`src/components/PrintToolbar.tsx`,
  `src/app/globals.css:132`).
- Public read-only snapshots at `/s/[shareId]` served from Vercel Blob
  (`src/app/s/[shareId]/page.tsx`, `src/lib/share-store.ts`).
- Settings: rename workspace, change display name, sign out
  (`src/components/SettingsPage.tsx`).
- Legal pages at `/privacy` and `/terms` (`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`).

## Stack

From `package.json`:

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.2.10, App Router |
| UI runtime | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss`, shadcn-style primitives on `@base-ui/react` |
| Auth | Firebase Auth 12 (`firebase/auth`) |
| Database | Cloud Firestore 12 (`firebase/firestore`) |
| Share snapshots | `@vercel/blob` 2.6.1 |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Syllable patterns | `hyphen` 1.14.1 with `hyphen/patterns/en-us` |
| IDs | `nanoid` 5 (share ids) and `crypto.randomUUID()` (domain ids) |
| Toasts | `sonner` |
| Icons | `lucide-react` |

There is no test framework, no state library, no data-fetching library, and no schema
validation library. State is React context plus component state; persistence is direct SDK
calls.

## Repository map

```
src/app/                      App Router routes
  layout.tsx                  Root layout: dark theme, AuthProvider, TooltipProvider, Toaster
  (workspace)/                Authenticated group: layout = AuthGate > WorkspaceSongsProvider > AppShell
    page.tsx                  / — workspace home
    settings/page.tsx         /settings
    songs/page.tsx            /songs — redirect to /
    songs/recent/page.tsx     /songs/recent — redirect to /
  songs/[id]/page.tsx         /songs/[id] — editor (outside the group)
  songs/[id]/rehearsal/       /songs/[id]/rehearsal — rehearsal view (outside the group)
  s/[shareId]/page.tsx        /s/[shareId] — public server-rendered snapshot
  api/share/route.ts          POST /api/share — snapshot writer
  login/page.tsx              /login
  privacy/page.tsx, terms/    legal pages
src/components/               UI, editors, rehearsal renderers, shell
src/lib/                      domain logic (pure modules)
src/lib/firebase/             client init, auth, workspace, songs repository, migration
src/lib/songTypes.ts          the Song aggregate type surface
src/lib/songStorage.ts        factories + normalizeSong() migration boundary
src/lib/arrangement.ts        arrangement resolvers and mutations
src/lib/timing.ts             bar/event timing engine
src/lib/annotationUtils.ts    technique range grouping and annotation mutations
src/lib/lineText.ts           lyric-edit reconciliation against token structure
src/lib/syllableSplitter.ts   syllable splitting (dictionary -> exceptions -> hyphen patterns)
src/lib/syllableDictionary.ts localStorage user dictionary (uncommitted)
docs/                         this documentation set
scripts/                      manual validation scripts (not wired to npm or CI)
firestore.rules               security rules (deployed via firebase.json)
```

## Runtime topology

Two execution contexts, and the boundary is explicit:

1. **Browser.** Almost everything is a client component. Auth, Firestore reads/writes, the
   editor, rehearsal rendering, print, and share creation all run in the browser. Firestore
   security rules, not application code, are the authorization boundary for data.
2. **Server (Next.js route handlers and server components).** Only two server surfaces touch
   application data: `POST /api/share` (`src/app/api/share/route.ts:75`) and the
   `/s/[shareId]` server component plus its `generateMetadata`
   (`src/app/s/[shareId]/page.tsx:49`, `:81`). Both use the server-only Blob module
   (`src/lib/share-store.ts:1`, `import "server-only"`).

There is no middleware (`src/middleware.ts` does not exist), no server action, and no API route
for songs. Songs are read and written directly against Firestore from the client.

## Persistence topology

```
Browser
  |-- Firebase Auth (session) -------------------------- users/{uid}
  |-- Firestore SDK ------------------------------------ workspaces/{workspaceId}
  |                                                       workspaces/{workspaceId}/members/{uid}
  |                                                       workspaces/{workspaceId}/songs/{songId}
  |                                                       workspaces/{workspaceId}/songs/{songId}/document/current
  |-- localStorage ------------------------------------- choirscript.songs.v1 (legacy import source)
  |                                                       choirscript.migration.progress.v1
  |                                                       choirscript.syllableDictionary.v1 (uncommitted)
  |
  '-- POST /api/share -> Vercel Blob -> shares/{shareId}.json
                              ^
Browser /s/[shareId] <---------'  (server component reads Blob, renders read-only rehearsal)
```

Firestore document shapes and the Blob contract are documented in
[backend/README.md](../backend/README.md). The aggregate itself is documented in
[data-model.md](data-model.md).

## Module responsibilities

| Module | Responsibility | Depends on |
| --- | --- | --- |
| `src/lib/songTypes.ts` | Type surface for the persisted aggregate and view-level types | nothing |
| `src/lib/songStorage.ts` | Factories (`createEmptySong`, `createId`, `createLineFromText`), `normalizeSong()`, line/song duplication, legacy localStorage helpers | `arrangement`, `timing`, `syllableSplitter`, `defaultTechniques` |
| `src/lib/arrangement.ts` | `resolveArrangement()`, occurrence mutations, v1->v2 migration, `hasMeaningfulArrangement()` | `songStorage` (for `createId`) |
| `src/lib/timing.ts` | Meter settings, bar construction, event placement, part overrides, `ensureTimingForSong()`, `migrateSongTiming()` | `songTypes` |
| `src/lib/annotationUtils.ts` | Flatten syllables, group annotations into display ranges, apply/remove techniques | `defaultTechniques`, `songStorage` |
| `src/lib/lineText.ts` | Reconcile plain-text lyric edits against existing word/syllable tokens, prune stale annotations, remap timing | `songStorage`, `syllableSplitter` |
| `src/lib/syllableSplitter.ts` | Split a word into sung syllables; parse manual hyphen input | `hyphen`, `syllableDictionary` |
| `src/lib/syllableDictionary.ts` | Per-browser manual split memory and "apply everywhere" preference (uncommitted) | localStorage |
| `src/lib/lyricsParser.ts` | Parse pasted lyrics into sections/lines; flag scraped site chrome | nothing |
| `src/lib/songSummary.ts` | Derive per-song module presence for card metadata | `arrangement` |
| `src/lib/songSelection.ts` | Enabled voice parts, presence of part entries, preset labels | `songTypes` |
| `src/lib/firebase/songs.ts` | Song repository: list/get/create/save/duplicate/delete/backfill | Firestore SDK, `songStorage`, `songSummary` |
| `src/lib/firebase/AuthContext.tsx` | Auth state machine and workspace bootstrap | `auth.ts`, `client.ts`, `workspace.ts` |
| `src/lib/firebase/migration.ts` | One-time import of legacy localStorage songs into Firestore | `songs.ts`, `songStorage` |
| `src/lib/share-store.ts` | Create/read immutable share payloads in Blob | `@vercel/blob`, `songStorage` |

## Key structural properties

- **Single aggregate.** A song is one JSON aggregate with one schema version, stored whole in
  one Firestore document (`ADR-0003`, `ADR-0004`).
- **One sanitizer.** Every read and every write passes through `normalizeSong()` in
  `src/lib/songStorage.ts:284`. It migrates v1 songs, repairs missing IDs, prunes dangling
  annotation and arrangement references, and derives voice-part defaults.
- **Source is canonical; occurrence is placement.** Lyrics, SATB cues, techniques, director
  notes, and timing live in `song.source.sections`. An `Arrangement` only stores ordered
  references plus a repeat count and a note, so a repeated chorus is one section rendered
  several times (`src/lib/arrangement.ts:52`).
- **Timing is keyed by line, not by occurrence.** `Song.timingByLine[lineId]` with
  `sharedEvents` plus `partOverrides` (`src/lib/songTypes.ts:68`). Repeated sections reuse the
  same timing.
- **Immutable sharing.** `POST /api/share` writes a snapshot with `allowOverwrite: false` and
  a random 10-character id; later edits never change an existing link
  (`src/lib/share-store.ts:46`, `:67`).

## Dead code

Verified by searching for imports of every file in `src/components/`:

`AnnotationInspector`, `FloatingTechniqueToolbar`, `MetadataPanel`, `RawMarkupPreview`,
`SectionList`, `SelectableSyllableText`, `SelectedSyllableInspector`, `SongDashboard`,
`SyllableGrid`, `TechniquePalette`, `VoicePartCueInput` are never imported by another module.
The uncommitted `PartTransferMenu.tsx` is also not imported yet, but it is new work in progress
rather than abandoned code, so it is not counted here.

Two legacy localStorage song helpers are also unreachable from the UI: `loadSongs` and
`saveSongs` in `src/lib/songStorage.ts:410` and `:433`, and therefore `createSampleSong`
(`:172`), which only `loadSongs` calls. The cloud repository in `src/lib/firebase/songs.ts` is
the only live song persistence path. The legacy key is still read by
`src/lib/firebase/migration.ts:5` for the one-time import, which is why the constant and
`normalizeSong` remain.

## Uncommitted working tree (2026-10-31)

The working tree contains an in-progress syllable-editing and part-transfer change set that is
not in any commit:

- `src/lib/syllableDictionary.ts` (new), `src/lib/syllableSplitter.ts` (modified),
  `src/lib/lineText.ts` (modified): user dictionary, Unicode-aware tokenization, and
  `applyWordSyllables` for per-word or whole-song split application.
- `src/lib/partTransfer.ts` (new), `src/components/PartTransferMenu.tsx` (new): pure move/swap
  helpers and an unmounted menu component.
- `src/components/LyricLineBlock.tsx`, `src/components/SongEditor.tsx` (modified): split panel,
  dictionary writes, apply-everywhere switch.
This work is not shipped and is not described as a feature anywhere in these docs. See
[../future/README.md](../future/README.md) for its intended scope and open questions, and the
ledger for the exact file list at the time of writing.

## Documentation gaps and drift

The Phase 3A document (`docs/phase-3-source-arrangement-architecture.md`, 731 lines, committed
in `c93c194`) is a design document, not a description of the shipped system. Where it differs,
these docs follow the code. Concrete drift:

- Its "FINAL TYPES" section lacks `repeatCount`, `bassEnabled`, `voicePreset`, `enabledParts`,
  and `WordToken.syllabification`.
- It states that no component emits DOM ids from data ids; both rehearsal renderers now emit
  `id={"rehearsal-" + renderIdentity}`.
- Its `resolveArrangement` signature has no `repeatIndex` or `renderIdentity`.

Full list: [data-model.md#drift-from-the-phase-3a-document](data-model.md#drift-from-the-phase-3a-document).

## Where to read next

- Data shape and invariants: [data-model.md](data-model.md)
- Routes, gates, state ownership: [routing-and-state.md](routing-and-state.md)
- Rehearsal rendering and print: [rendering-and-print.md](rendering-and-print.md)
- Auth and rules: [../auth/README.md](../auth/README.md)
- Storage, shares, env, deployment: [../backend/README.md](../backend/README.md)
