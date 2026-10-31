# Routing and state

## Route table

| Route | File | Rendering | Gate |
| --- | --- | --- | --- |
| `/` | `src/app/(workspace)/page.tsx` | Server shell rendering a client page (`WorkspaceHomePage`) | `AuthGate` + `MigrationGate` via the group layout |
| `/settings` | `src/app/(workspace)/settings/page.tsx` | Same pattern (`SettingsPage`) | Same group layout |
| `/songs` | `src/app/(workspace)/songs/page.tsx` | Server `redirect("/")` | none (redirect happens before render) |
| `/songs/recent` | `src/app/(workspace)/songs/recent/page.tsx` | Server `redirect("/")` | none |
| `/songs/[id]` | `src/app/songs/[id]/page.tsx` | `Suspense` + client `SongEditor` | none at the route level |
| `/songs/[id]/rehearsal` | `src/app/songs/[id]/rehearsal/page.tsx` | Client `RehearsalView` | none at the route level |
| `/s/[shareId]` | `src/app/s/[shareId]/page.tsx` | Async server component + `generateMetadata` | Public |
| `/api/share` | `src/app/api/share/route.ts` | `POST` handler | Public (no auth check; see backend doc) |
| `/login` | `src/app/login/page.tsx` | Client `LoginPage` | Public; redirects to `/` when authenticated |
| `/privacy`, `/terms` | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | Server shell + `LegalPage` | Public |
| `/_not-found`, error boundaries | Next.js defaults | — | — |

The `/songs` and `/songs/recent` redirects are Phase 2.1 leftovers: the workspace at `/` is the
song library, and both files are seven-line `redirect()` stubs that explain themselves in
comments.

## Layout composition

```
src/app/layout.tsx                     html.dark, AuthProvider, TooltipProvider, Toaster
└── src/app/(workspace)/layout.tsx     AuthGate > WorkspaceSongsProvider > AppShell
    ├── /                              WorkspaceHomePage
    └── /settings                      SettingsPage

src/app/songs/[id]/page.tsx           (no group layout) > Suspense > SongEditor
                                      SongEditor wraps itself in WorkspaceSongsProvider > EditorShell
src/app/songs/[id]/rehearsal/page.tsx (no group layout) > RehearsalView > PrintToolbar
src/app/s/[shareId]/page.tsx          (no group layout) > header + rehearsal renderer
```

Two shells exist and they are not the same component:

- `AppShell` (`src/components/AppShell.tsx`) is the workspace chrome: identity, workspace name,
  Tips, Settings, New Song, account menu, plus the share dialog. It never shows editor controls.
- `EditorShell` (`src/components/EditorShell.tsx`) is the focused editor chrome: back arrow,
  title, save badge, Lyrics/Parts nav, Rehearsal button, share, duplicate, delete.

`RehearsalView` uses neither; it renders `PrintToolbar` plus its own display/print panel.

## Auth gating matrix

| Route | AuthGate | MigrationGate | How it gets `workspaceId` |
| --- | --- | --- | --- |
| `/`, `/settings` | yes | yes (inside AuthGate) | `useAuth()` inside the provider |
| `/songs/[id]` | no | no | `useAuth()`; effects no-op while null |
| `/songs/[id]/rehearsal` | no | no | `useAuth()`; effect no-ops while null |
| `/s/[shareId]` | no | no | Not needed; payload comes from Blob |
| `/login` | no | no | `useAuth()` for status only |

`AuthGate` is a client component that renders one of five screens based on
`status`/`bootstrapError` (`src/components/AuthGate.tsx:41`): loading, unconfigured,
unauthenticated, bootstrap-failed (retry + sign out), or `MigrationGate`-wrapped children.
`MigrationGate` then runs the legacy import and withholds children until it finishes
(`src/components/MigrationGate.tsx:53`).

The editor and rehearsal routes were deliberately placed outside the group in Phase 3 to get a
focused layout without the workspace chrome (`src/components/SongEditor.tsx:745` comment). The
consequence is that they have no redirect for signed-out visitors — see
[Known gaps](#known-gaps).

## State ownership

| State | Owner | Lifetime |
| --- | --- | --- |
| Firebase user, auth status, workspace id, workspace document, bootstrap error | `AuthProvider` (`src/lib/firebase/AuthContext.tsx:36`) at the root layout | Whole app session |
| Song metadata list used by the dashboard, create/duplicate/delete actions | `WorkspaceSongsProvider` (`src/components/WorkspaceSongsContext.tsx:52`) | Mount of the group layout, or mount of `SongEditor` |
| The open song aggregate, save status, lyric selection, active/focused section, pending dialogs, timing scope, inspector collapse | `SongEditor` local state (`src/components/SongEditor.tsx:79`-`:95`) | Until navigation away |
| Rehearsal toggles (parts, techniques, notes, large text, B&W) | `RehearsalView` local state (`src/components/RehearsalView.tsx:44`) | Until navigation away |
| Display/print options on a shared page | Constants in `src/app/s/[shareId]/page.tsx:18`, narrowed by `getEnabledVoiceParts` at `:111` | Static |
| Settings drafts (display name, workspace name) | `SettingsPage` local state | Until save or navigation |
| Share URL for the open dialog | `ShareDialog` local state (`src/components/ShareDialog.tsx:33`) | Reset each time the dialog opens |
| Editor view (`lyrics` vs `parts`) | URL query `?view=` (`src/components/SongEditor.tsx:95`) | Survives reload, shareable |

`?view=arrangement` is accepted as an alias for `parts` (`src/components/SongEditor.tsx:95`).
There is no `?view=arrangement` link in the UI; `EditorShell` only emits `?view=lyrics` and
`?view=parts`.

## Editor lifecycle

1. **Mount.** `SongEditor` reads `songId` from the route and `view` from the query. `useAuth()`
   supplies `uid` and `workspaceId`.
2. **Load.** An effect keyed on `[workspaceId, uid, songId]` clears prior state inside a
   microtask, then calls `getSongWithMeta(workspaceId, songId)` (`src/components/SongEditor.tsx:103`).
   That function reads the metadata document and `document/current` in parallel and returns
   `null` when either is missing (`src/lib/firebase/songs.ts:172`).
3. **Normalize.** The loaded song passes through `normalizeSong` before entering state
   (`src/components/SongEditor.tsx:135`). Bass visibility, the active section, and
   `saveState = "saved"` are set from the result.
4. **Edit.** Every mutation goes through `updateSong`, which applies the updater, stamps
   `updatedAt`, and sets `saveState = "dirty"` (`:204`).
5. **Autosave.** An effect watches `song` and `saveState`. When dirty it starts a 700 ms timer
   (`AUTOSAVE_DEBOUNCE_MS`, `:73`), sets `saving`, and calls the cloud `saveSong` with the
   current metadata (`:162`). Success replaces `songMeta` and flips to `saved` only if no edit
   occurred during the save; failure flips to `failed` and keeps the in-memory document.
6. **Parts preparation.** When `?view=parts` and a song is loaded, a zero-delay effect runs
   `preparePendingSyllabification` and marks the song dirty if any word changed (`:193`).
7. **Unload.** Nothing flushes or warns on navigation. See gaps.

Save state machine (`SaveState`, `src/components/SongEditor.tsx:71`):

```
idle --load--> saved --edit--> dirty --700ms--> saving --> saved
                                   ^               |
                                   |               '--> failed --edit--> dirty
                                   '--- edit while saving keeps dirty (saved is not applied)
```

A `failed` state is not retried on a timer: the autosave effect only runs when `saveState` is
`dirty`, so the next edit is what restarts it. The badge text is derived at `:734` and again in
`EditorShell` (`src/components/EditorShell.tsx:52`).

## Dashboard data flow

`WorkspaceHomePage` consumes `useWorkspaceSongs()` (`src/components/WorkspaceHomePage.tsx:347`).
The provider performs exactly one metadata query per workspace mount via
`listSongs(workspaceId)` ordered by `updatedAt desc` (`src/lib/firebase/songs.ts:150`), sorts
client-side as well (`src/components/WorkspaceSongsContext.tsx:40`), and exposes optimistic
mutations:

- `createSong` merges an empty song with the dialog metadata, writes metadata + body, and
  prepends the new card (`src/components/WorkspaceSongsContext.tsx:154`).
- `duplicateSong` calls the cloud duplicate and prepends the copy (`:182`).
- `deleteSong` removes the card immediately, deletes both documents, and restores the previous
  array on failure (`:200`).

Cards whose metadata lacks a current card summary trigger a background backfill: one body read
plus one metadata write per stale song, deduped per session by an in-flight map
(`src/lib/firebase/songs.ts:329`, `src/components/WorkspaceSongsContext.tsx:74`).

## Migration gate lifecycle

`MigrationGate` only runs when both `uid` and `workspaceId` exist
(`src/components/MigrationGate.tsx:61`). It short-circuits to `complete` when
`localStorage["choirscript.songs.v1"]` is absent, otherwise it shows `migrating` and calls
`runLegacyMigrationOnce(workspaceId, uid)`, which is single-flight per workspace+user
(`src/lib/firebase/migration.ts:200`). Results:

- `failed` renders a retry screen; local data is untouched and already-imported songs are
  skipped on retry because progress is persisted per legacy id
  (`src/lib/firebase/migration.ts:326`).
- `migrated` with `imported > 0` shows a toast, then renders children.

The detail that matters for debugging: the gate runs *before* children mount, so `/` never
queries songs while an import is in flight.

## Share flow

`ShareDialog` posts `{ song }` to `/api/share` (`src/components/ShareDialog.tsx:73`). The route
validates size and shape, calls `createSharedSong`, and returns an absolute URL built from the
request origin (`src/app/api/share/route.ts:106`). The dialog shows the URL with a copy button
and an "Open link" action. The shared page renders server-side and never mounts any of the
authenticated providers.

## Known gaps

Verified in code, not observed in a browser:

1. **Signed-out deep links never resolve.** `/songs/[id]` and `/songs/[id]/rehearsal` do not
   mount `AuthGate`. With `uid`/`workspaceId` null the load effect returns immediately, so
   `SongEditor` renders "Loading editor..." indefinitely and `RehearsalView` renders "Loading
   rehearsal view..." indefinitely. There is no redirect to `/login`.
2. **No unsaved-work guard.** There is no `beforeunload`, `visibilitychange`, or route-change
   handler anywhere in `src/`. An edit made less than 700 ms before navigation is lost.
3. **No retry of failed saves without an edit.** See the state machine above.
4. **Hash navigation is not implemented.** `handleEditSource` pushes
   `/songs/{id}?view=lyrics#source-{sectionId}` and moves focus with a ref
   (`src/components/SongEditor.tsx:354`, `src/components/DocumentScriptEditor.tsx:194`), but
   nothing calls `scrollIntoView` for that hash. The roadmap's `jumpTo` is the only
   `scrollIntoView` call in the codebase (`src/components/ArrangementRoadmap.tsx:39`).
5. **Editor page is not wrapped in `Suspense` on the rehearsal route**, so `useSearchParams`
   is only used inside the editor, which is wrapped (`src/app/songs/[id]/page.tsx:12`).

## Related

- Auth details: [../auth/README.md](../auth/README.md)
- Rendering: [rendering-and-print.md](rendering-and-print.md)
- Save/load repository contract: [../backend/README.md](../backend/README.md)
