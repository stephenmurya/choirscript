# Architecture — Current State

**Purpose:** the verified map of what exists on 2026-11-01 (commit `b6eb796`), so that planning
documents can be precise about what is being replaced, extended or kept.

Supersedes nothing; it is the present-tense companion to `overview.md` (which carries the module
inventory) and `data-model.md` (which carries field-level shapes).

## Stack

| Layer | What is actually in use |
| --- | --- |
| Framework | Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), shadcn-style primitives over `@base-ui/react` 1.6 |
| Client state | React state in one large editor component plus refs; no store library |
| Drag and drop | `@dnd-kit/core` + `sortable` (arrangement occurrences only) |
| Icons / toast / command | `lucide-react`, `sonner`, `cmdk` (slash-command menu) |
| Auth | Firebase Auth 12 — Google popup/redirect, email/password, reset email |
| Database | Cloud Firestore (client SDK, security rules), split `document/current` body |
| Object storage | Vercel Blob (`@vercel/blob` 2.6) for share payloads, revisions, edit tokens |
| Live updates | Firestore `onSnapshot` on a `shareHeads/{id}` doorbell document |
| Hosting | Vercel (production: `choirscript.vercel.app`) |
| Tests | **None.** No runner, no test files, no CI workflow |

`package.json` has four scripts: `dev`, `build`, `start`, `lint`. Type checking is `npx tsc
--noEmit`, run manually.

## Surfaces

| Route | Purpose | Auth |
| --- | --- | --- |
| `/` | Workspace home: recent songs, dashboard | Required |
| `/songs` | Song library | Required |
| `/songs/recent` | Recently edited | Required |
| `/songs/[id]` | The editor (`SongEditor`) | Required |
| `/songs/[id]/rehearsal` | Rehearsal view for the owner | Required |
| `/s/[shareId]` | Public rehearsal view of a shared song | **None** |
| `/settings` | Profile, workspace, migration state | Required |
| `/login`, `/privacy`, `/terms` | Auth and legal | None |
| `POST /api/share` | Create a link, mint an edit token | None |
| `GET /api/share/[shareId]` | Read the current payload | None |
| `PUT /api/share/[shareId]` | Republish (requires `editToken`) | Token |
| `GET /api/share/[shareId]/rev` | Revision + `updatedAt` | None |

## Request and data flow

```text
Editor (/songs/[id])
  user edit ──► updateSong() ──► React state ──► 700 ms debounce ──► saveSong() ─► Firestore
                                                                     │
                                                      song.updatedAt changes
                                                                     ▼
                                                   2 s debounce ──► PUT /api/share/{id}
                                                                     ├─► Blob: shares/{id}.json
                                                                     ├─► Blob: shares/{id}.rev.json
                                                                     └─► Firestore: shareHeads/{id}
                                                                                    │
Viewer (/s/[shareId])                                                               │
  server render ◄── Blob payload ◄──────────────────────────────────────────────────┤
  SharedSongLive holds onSnapshot ──────────────────────────────────────────────────┘
    bump ──► GET /api/share/{id} ──► revision compare ──► swap state in place
    visibilitychange ──► one catch-up fetch
```

## Editor composition

`SongEditor.tsx` (1,183 lines) is the orchestrator: it loads the song, holds history, autosave,
publishing, the active nav tab, panel widths, dialogs and every mutation callback. The panels
under it are presentational and receive `song` plus mutators.

| Module | Responsibility |
| --- | --- |
| `EditorShell.tsx` | Header (import, settings, undo/redo, share), nav, layout |
| `SongEditor.tsx` / `DocumentScriptEditor.tsx` | Editor shell + the lyric/timing column host |
| `EditorNav.tsx` | Lyrics · Parts · Advanced timing |
| `LyricLineBlock.tsx` → `VoicePartLanes.tsx` → `NotationInput.tsx` | Line rendering and SATB entry |
| `AdvancedTimingLine.tsx` | Bar and event editing |
| `ArrangementEditor.tsx` | Occurrence list, drag reorder, performer/voicing/repeat |
| `ArrangementRoadmap.tsx` | Rail, scroll-spy, mobile bar |
| `ColorfulRehearsalView.tsx` / `AdvancedTimingRehearsalView.tsx` | Rehearsal renderers |
| `SharedSongLive.tsx` | Viewer shell: live swap, header, print |
| `ShareDialog.tsx` | Create link, copy, publish now |

## Known structural debt

1. **`SongEditor` is a god component.** Load, persistence, history, publishing and every mutation
   live in one file; it is the main obstacle to both testability and any multi-arrangement UI.
2. **Normalisation is the only validation.** `normalizeSong` coerces and repairs on read; nothing
   reports an invalid document.
3. **No test surface.** Every guarantee in these docs is behavioural, observed by hand.
4. **Two rehearsal renderers.** Simple and advanced duplicate lane, performer and melody logic;
   the future notation compiler should subsume both.
5. **Stringly-typed music.** Tempo is a string; pitch is a note name; timing is integer units.
   Only the timing units are truly structured.
6. **Device-local memory.** Syllable dictionary, performer suggestions, panel widths and view
   toggles are `localStorage`; nothing follows a user across devices.

## What is genuinely solid

- The Source/Arrangement split with stable ids and occurrence-level metadata.
- The timing model (bars, units, shared vs per-part overrides) — small, precise, and the correct
  foundation for a notation compiler.
- The share pipeline: blob authoritative, doorbell advisory, in-place swap, focus catch-up.
- The rules file: membership-based, role-aware, deny-by-default, with a single public doorbell
  collection that holds no content.
