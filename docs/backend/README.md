# Backend, storage, and deployment

## Topology

ChoirScript has no application server for song data. Two managed services hold all state:

| Service | Used for | Accessed from |
| --- | --- | --- |
| Cloud Firestore | users, workspaces, memberships, song metadata, song bodies | Browser, via Firebase client SDK |
| Vercel Blob | immutable read-only share snapshots | `POST /api/share` and the `/s/[shareId]` server component only |
| Firebase Auth | identity | Browser |

The only Next.js server code that touches data is `src/app/api/share/route.ts` and the
`/s/[shareId]` page (`src/app/s/[shareId]/page.tsx`), both backed by
`src/lib/share-store.ts`, which begins with `import "server-only"` (`:1`) so it cannot be
bundled into a client component.

There are no Cloud Functions, no Firebase Storage usage, no App Check configuration, no cron
jobs, and no queue.

## Firestore data model

```
users/{uid}
workspaces/{workspaceId}
workspaces/{workspaceId}/members/{uid}
workspaces/{workspaceId}/songs/{songId}                        <- metadata (dashboard)
workspaces/{workspaceId}/songs/{songId}/document/current        <- whole Song aggregate
```

### `users/{uid}`

Written by bootstrap (`src/lib/firebase/auth.ts:101`) and settings (`src/lib/firebase/workspace.ts:100`).

```json
{
  "uid": "…",
  "displayName": "Ada",
  "email": "ada@example.com",
  "photoURL": "https://…",
  "defaultWorkspaceId": "default-…",
  "createdAt": "2026-09-05T…",
  "updatedAt": "2026-09-05T…"
}
```

Type: `UserProfile`, `src/lib/firebase/types.ts:43`. `defaultWorkspaceId` is written in a second
write (`merge: true`) because rules forbid it on create (`firestore.rules:64`).

### `workspaces/{workspaceId}`

```json
{
  "id": "default-…",
  "name": "My Workspace",
  "createdBy": "…",
  "createdAt": "…",
  "updatedAt": "…"
}
```

Type: `Workspace`, `src/lib/firebase/types.ts:53`. Ids are always `default-{uid}` today
(`src/lib/firebase/auth.ts:151`); rules allow creating only that shape
(`firestore.rules:87`). Reads go through `getWorkspace`, which defensively defaults a missing
name to "My Workspace" (`src/lib/firebase/workspace.ts:20`).

### `workspaces/{workspaceId}/members/{uid}`

```json
{
  "uid": "…",
  "role": "owner",
  "displayName": "Ada",
  "email": "ada@example.com",
  "createdAt": "…",
  "updatedAt": "…"
}
```

Type: `WorkspaceMember`, `src/lib/firebase/types.ts:61`. `WorkspaceRole` is
`"owner" | "admin" | "editor" | "viewer"` (`:4`), but only `owner` is ever written. Membership
documents are what the rules consult for every workspace-scoped decision.

### `workspaces/{workspaceId}/songs/{songId}` (metadata)

```json
{
  "id": "song_…",
  "title": "Amazing Grace",
  "artist": "Traditional",
  "key": "G",
  "tempo": "Slow 72 BPM",
  "mode": "simple",
  "createdAt": "…",
  "updatedAt": "…",
  "createdBy": "uid",
  "updatedBy": "uid",
  "schemaVersion": 1,
  "cardSummary": {
    "version": 2,
    "modules": ["lyrics", "vocalParts", "arrangement"],
    "contributors": {
      "total": 1,
      "preview": [{ "uid": "uid", "displayName": "Ada", "photoURL": "…" }]
    }
  }
}
```

Type: `SongMeta`, `src/lib/firebase/types.ts:75`. Note the independent version numbers: the
document is `schemaVersion: 1`, while `cardSummary.version` is 2
(`CARD_SUMMARY_VERSION`, `src/lib/firebase/songs.ts:57`).

Purpose: dashboard cards render from this document alone; `document/current` is never read to
list songs (comment at `src/lib/firebase/types.ts:70`).

### `workspaces/{workspaceId}/songs/{songId}/document/current` (body)

```json
{
  "schemaVersion": 2,
  "song": { "...": "the whole Song aggregate" },
  "updatedAt": "…",
  "updatedBy": "uid"
}
```

Type: `SongDocument`, `src/lib/firebase/types.ts:90`. The `Song` aggregate itself is documented
in [../architecture/data-model.md](../architecture/data-model.md).

Read tolerance: `parseDocument` accepts either the wrapper shape or a payload that already
looks like a `Song` (`src/lib/firebase/songs.ts:133`), forces `id`/`title` from the metadata
document, and defaults `timingByLine` to `{}` so very old documents can still be normalized
(`:138`-`:146`).

### Write paths

All song writes are `writeBatch` calls that pair the metadata document with the body, so a
song cannot end up with fresh metadata and a stale body (or vice versa) after a successful
commit:

| Operation | Function | Writes | Notes |
| --- | --- | --- | --- |
| Create | `createSong` (`src/lib/firebase/songs.ts:216`) | meta + body | Normalizes first; optional pre-read collision check (default on); preserves the supplied song id |
| Save | `saveSong` (`:253`) | meta + body | Recomputes `cardSummary` via `metaFromSong`; preserves `createdBy` |
| Duplicate | `duplicateSong` (`:283`) | meta + body under new ids | Reads source body, calls local `duplicateSong`, then `createSong` with `checkCollision: false` |
| Delete | `deleteSong` (`:303`) | deletes both | No soft delete, no recovery |
| Backfill | `backfillSongCardSummary` (`:335`) | meta only | One body read per stale song; merge write of `cardSummary` |

`createSong` normalizes the aggregate before writing (`:224`), so the persisted body is always
schema v2 with repaired references. `saveSong` does the same (`:262`).

Failure mapping: `permission-denied` becomes "You don't have access to this workspace." and
`unavailable` becomes "Cloud storage is temporarily unavailable. Try again shortly."
(`src/lib/firebase/songs.ts:42`).

### Query patterns and indexes

`listSongs` runs a single query ordered by `updatedAt` descending
(`src/lib/firebase/songs.ts:153`). That is a single-field order, which Firestore indexes
automatically; the repository declares no composite indexes, and there is no `firestore.indexes.json`
in the repository. There are no realtime listeners, no pagination, and no server-side filtering:
all songs in a workspace are returned in one read and sorted again in the client
(`src/components/WorkspaceSongsContext.tsx:40`).

Cost shape of a workspace load: 1 collection query returning N metadata documents, plus
background backfill reads (1 body read + 1 metadata write) for any metadata lacking a
current-version card summary (`src/components/WorkspaceSongsContext.tsx:74`).

## Firestore rules file

`firestore.rules` is the deployed ruleset; `firebase.json` points at it:

```json
{ "firestore": { "rules": "firestore.rules" } }
```

The project alias is `choirscript-d2651` (`.firebaserc`). Rules semantics are summarized in
[../auth/README.md](../auth/README.md#firestore-rules-summary). The operational points for
backend work:

- Every workspace-scoped rule resolves membership with `exists()`/`get()` on
  `workspaces/{id}/members/{uid}`; these count as document reads for billing.
- Song bodies live under the metadata document, so body reads and writes inherit the same
  membership check as the metadata (`firestore.rules:127`-`:131`). Adding a new subcollection
  under `songs/{id}` requires a new rule block; the catch-all at `:136` denies by default.
- `delete` of `users/{uid}` and `workspaces/{id}` is denied, so account/workspace deletion
  cannot be implemented from the client as the rules stand.

## Share pipeline (Vercel Blob)

### Write path

`ShareDialog` posts the whole in-memory song to `/api/share`
(`src/components/ShareDialog.tsx:73`). `POST` in `src/app/api/share/route.ts:75`:

1. Rejects when `Content-Length` exceeds 1 MiB (`MAX_SHARE_PAYLOAD_BYTES`, `:4`, `:78`).
2. Reads the body as text and rejects when the encoded byte length exceeds the same limit
   (`:90`) — this catches chunked requests without a length header.
3. Rejects invalid JSON (`:98`) and payloads that are not `{ song: { title: non-empty string } }`
   (`:102`).
4. Calls `createSharedSong(parsed.song)` and returns
   `{ shareId, url: new URL(share.url, request.url).toString() }` (`:107`-`:111`).
5. On a Blob failure, logs the real exception server-side and returns
   `{ error: "Could not create share link.", diagnostic: "blob:…" }` with status 500
   (`:112`-`:123`). No tokens or credentials are logged (`:18`-`:50`, `:69`-`:72`).

`createSharedSong` (`src/lib/share-store.ts:46`):

- Generates `shareId = nanoid(10)` (`:49`), matching `SHARE_ID_PATTERN`
  `/^[A-Za-z0-9_-]{10,32}$/` (`:9`).
- Builds a `SharedSongPayload` (`schemaVersion: 2`, `shareId`, timestamps, top-level
  `title`/`artist`/`key`/`bpm` copied from the song, `song: normalizeSong(song)`), `:51`-`:65`.
- Writes `shares/{shareId}.json` with `access: "private"`, `allowOverwrite: false`,
  `contentType: "application/json"` (`:67`-`:71`). Immutability is enforced by the storage
  option, not by convention: a second write to the same path fails.
- Returns the relative URL `/s/{shareId}`.

Before writing it logs the resolved credential mode: `BLOB_READ_WRITE_TOKEN`, or
`VERCEL_OIDC_TOKEN` together with `BLOB_STORE_ID`, or `none`
(`logBlobAuthMode`, `src/lib/share-store.ts:15`). This log line is the first thing to read when
share creation fails on a preview deployment.

There is **no authentication check** on `POST /api/share`. Anyone who can reach the endpoint can
store a payload of up to 1 MiB and receive a public link to it. The payload must be a
well-formed song with a title, but it need not belong to the caller.

### Read path

`/s/[shareId]` is a server component. `generateMetadata` and the page both call
`getSharedSong(shareId)`, which is wrapped in React `cache()` so the stream-consuming Blob GET
happens once per request (`src/lib/share-store.ts:86`; comment at `:79`-`:85`).

`getSharedSong`:

1. Rejects ids that do not match `SHARE_ID_PATTERN` (`:87`).
2. `get("shares/{id}.json", { access: "private", useCache: true })` (`:92`).
3. Returns `null` unless `statusCode === 200` and a stream exists (`:97`).
4. Parses the payload and requires `schemaVersion` in `[1, 2]`, a matching `shareId`, and a
   `song` (`:104`). Schema 1 snapshots are accepted and normalized in memory (`:108`-`:112`);
   the Blob object is never rewritten.
5. Any thrown error becomes `null` (`:113`), so a missing, expired, or malformed snapshot all
   render the same "This ChoirScript link is unavailable." card
   (`src/app/s/[shareId]/page.tsx:85`).

The page then renders `AdvancedTimingRehearsalView` or `ColorfulRehearsalView` based on
`song.mode` with all display toggles on except large text and black-and-white
(`src/app/s/[shareId]/page.tsx:18`, `:143`), narrowed to the song's enabled parts (`:111`).
`SharedPageActions` provides copy-link and print (`src/components/SharedPageActions.tsx`).

There is no delete path for snapshots in the codebase: no `del()` import from `@vercel/blob`,
no admin route, no lifecycle policy expressed in the repo.

## Environment variables

`.env.example` (untracked because `.gitignore` has `.env*`, `:34`) contains only the Firebase
web config:

| Variable | Required | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes (one of three required for "configured") | `src/lib/firebase/client.ts:6` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes for Google sign-in | `client.ts:7` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes; also used by `next.config.ts:3` for the auth rewrite | `client.ts:8` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | listed in the template, unused by code | `client.ts:9` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | listed in the template, unused by code | `client.ts:10` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | yes | `client.ts:11` |

Blob credentials are **not** in `.env.example`, although the share feature requires one of:

| Variable | Where referenced | Meaning |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | `src/lib/share-store.ts:16`, `src/app/api/share/route.ts:39` | Static read/write token for the Blob store |
| `VERCEL_OIDC_TOKEN` | `src/lib/share-store.ts:17` | Vercel-issued OIDC token (automatic on Vercel) |
| `BLOB_STORE_ID` | `src/lib/share-store.ts:18` | Store id required alongside OIDC |

The template is therefore incomplete for local share testing, and the `.gitignore` rule means a
corrected template would still not be committed.

`NODE_ENV` gates development logging: bootstrap trace in `src/lib/firebase/auth.ts:72`.

## Deployment on Vercel

Verified repository facts:

- `.vercel/project.json` names the project `choirscript` (`projectId prj_jf6EF…`, org
  `team_42sj…`). The `.vercel` directory is git-ignored (`.gitignore:37`).
- There is no `vercel.json`. Build and runtime behavior are whatever Vercel's Next.js preset
  does by default: `npm run build` (`next build`) and `npm run start`.
- `next.config.ts` sets `turbopack.root` to `process.cwd()` and declares the `/__/auth/*`
  rewrite described above (`:6`-`:22`).
- `package.json` has no `postinstall`, no custom output directory, and no test step.
- Firebase hosting is not used; `firebase.json` only declares Firestore rules.
- The share feature needs a Blob store connected to the Vercel project. On Vercel, connecting a
  store injects the credentials; without it, `POST /api/share` returns the 500 diagnostic path.

Checklist to reproduce a working deployment:

1. Vercel project linked to the repository, framework preset Next.js, default build command.
2. The six `NEXT_PUBLIC_FIREBASE_*` variables set for Production, Preview, and Development as
   needed.
3. A Vercel Blob store connected to the project (or `BLOB_READ_WRITE_TOKEN` set explicitly, with
   `BLOB_STORE_ID` when using OIDC).
4. Firebase Console: the deployment hostname added to Authentication -> Settings -> Authorized
   domains, otherwise Google popup/redirect sign-in fails with an unauthorized-domain error.
5. Firestore rules deployed from `firestore.rules` for project `choirscript-d2651`
   (`firebase deploy --only firestore:rules`).
6. The Firebase web app's `authDomain` set to the public app host, as `.env.example:3` instructs,
   so redirect sign-in stays same-origin.

## Local development

- `npm run dev` (`next dev`, Turbopack), `npm run build`, `npm run lint`
  (`eslint`, flat config in `eslint.config.mjs`).
- `.env.local` and `.env.vercel.local` are present in the working tree and untracked; the
  former holds the Firebase config for local runs.
- Share creation requires Blob credentials in the local environment; without them the route
  logs `blob:no-credentials` and the dialog surfaces the diagnostic suffix
  (`src/components/ShareDialog.tsx:83`).
- Google sign-in requires `localhost` in Firebase authorized domains; email/password works
  without it.
- No emulator suite is configured. There is no `firebase.json` emulator block and no
  `connectFirestoreEmulator` call.

## Operational notes and limits

- **Payload size.** Share snapshots are capped at 1 MiB, enforced twice (header and encoded
  length). A very large song with dense timing data is the realistic way to hit this.
- **No rate limiting.** `/api/share` has no per-IP or per-user throttle, and no auth.
- **No snapshot deletion or expiry.** Links live until the Blob object is removed out of band.
- **No cache headers or CDN tuning** in the repo beyond the Blob SDK's `useCache` read option.
- **Firestore write amplification.** Autosave writes the entire aggregate plus metadata on every
  700 ms-quiet edit burst; the body document grows with song size.
- **Error surface.** Firestore errors are mapped to two friendly messages; everything else
  passes through as the original `Error` message (`src/lib/firebase/songs.ts:42`). Blob errors
  are classified into `blob:no-credentials`, `blob:no-store-id`, `blob:oidc`,
  `blob:<SdkErrorName>`, or `blob:unknown` (`src/app/api/share/route.ts:24`).
