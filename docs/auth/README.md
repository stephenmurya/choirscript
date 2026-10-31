# Authentication and authorization

## Model

ChoirScript uses Firebase Authentication for identity and Cloud Firestore for the user profile
and workspace records. There is no server session, no auth cookie, and no middleware. The
browser holds the Firebase session (persisted by the SDK), reads and writes Firestore directly,
and **Firestore security rules are the only authorization boundary** for data
(`firestore.rules`). Application code decides what to show; rules decide what is allowed.

Auth-related modules:

| File | Role |
| --- | --- |
| `src/lib/firebase/client.ts` | Config read, app/auth/firestore singletons, sync auth accessor, redirect completion |
| `src/lib/firebase/auth.ts` | Sign-in/out functions, error mapping, profile + workspace bootstrap |
| `src/lib/firebase/AuthContext.tsx` | React state machine over `onAuthStateChanged` and bootstrap |
| `src/lib/firebase/workspace.ts` | Workspace identity read/rename, profile read, display-name update |
| `src/components/AuthGate.tsx` | Full-page gate for protected routes |
| `src/components/MigrationGate.tsx` | Legacy import gate inside `AuthGate` |
| `src/components/LoginPage.tsx` | Sign-in, sign-up, password reset UI |
| `src/app/login/page.tsx` | Route wrapper for `LoginPage` |

## Configuration

Six public variables, all read at module scope in `src/lib/firebase/client.ts:5`:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

`isFirebaseConfigured()` requires only `apiKey`, `projectId`, and `appId`
(`src/lib/firebase/client.ts:14`). A deployment missing any of those three reports
`status = "unconfigured"` and `AuthGate` shows a configuration screen instead of the app
(`src/components/AuthGate.tsx:64`).

`storageBucket` is passed to `initializeApp` but nothing in `src/` uses Firebase Storage.

`next.config.ts` adds a same-origin rewrite for the Firebase auth helper:

```
/__/auth/:path*  ->  https://{NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/:path*
```

The comment in that file gives the reason: keeping the redirect helper on the ChoirScript origin
stops browsers that block third-party storage from dropping the returned Google session.

## Initialization order

Three exported accessors exist because of one constraint: `signInWithPopup` must be called
inside the click's transient user activation.

1. `ensureFirebaseAuthReady()` starts (or joins) initialization and caches the `Auth` instance
   (`src/lib/firebase/client.ts:68`). `AuthProvider` calls it on mount
   (`src/lib/firebase/AuthContext.tsx:56`), and `LoginPage` calls it on mount too
   (`src/components/LoginPage.tsx:59`).
2. `getInitializedFirebaseAuth()` returns the cached instance synchronously, or `null`
   (`src/lib/firebase/client.ts:84`). The Google button is disabled until it is non-null
   (`src/components/LoginPage.tsx:48`).
3. `completeFirebaseRedirectSignIn()` wraps `getRedirectResult` in a single promise so the
   redirect path is only completed once per page load
   (`src/lib/firebase/client.ts:89`). `LoginPage` calls it on mount and routes to `/` when it
   yields a user (`src/components/LoginPage.tsx:77`).

`signInWithGoogle()` rejects with "Sign-in is still initializing" when the cached instance is
missing, constructs `GoogleAuthProvider`, and calls `signInWithPopup` with no `await` between
the gesture and the popup. On `auth/popup-blocked` it retries with `signInWithRedirect`
(`src/lib/firebase/auth.ts:257`-`:285`).

Firestore is initialized separately with `ignoreUndefinedProperties: true`
(`src/lib/firebase/client.ts:99`), which is what allows optional fields such as `bass` and
`pickupBeats` to be written as `undefined` without throwing.

## Sign-in methods

| Method | Function | Notes |
| --- | --- | --- |
| Google popup | `signInWithGoogle` (`src/lib/firebase/auth.ts:257`) | Falls back to full-page redirect on popup block |
| Email + password sign-in | `signInWithEmail` (`:287`) | |
| Email + password sign-up | `signUpWithEmail` (`:293`) | Optionally sets the Auth `displayName` via `updateProfile` |
| Password reset | `requestPasswordReset` (`:308`) | `sendPasswordResetEmail` |
| Sign out | `signOutUser` (`:313`) | Used by `AppShell`, `SettingsPage`, `AuthGate` bootstrap-error screen |

`describeAuthError` (`src/lib/firebase/auth.ts:31`) maps Firebase codes to user copy:

| Code | Message |
| --- | --- |
| `auth/invalid-email` | "That email address doesn't look valid." |
| `auth/email-already-in-use` | "An account already exists with that email. Try signing in instead." |
| `auth/weak-password` | "That password is too weak. Use at least 6 characters." |
| `auth/wrong-password`, `auth/invalid-credential`, `auth/user-not-found` | "Incorrect email or password." |
| `auth/too-many-requests` | "Too many attempts. Please wait a moment and try again." |
| `auth/popup-closed-by-user`, `auth/cancelled-popup-request` | "Google sign-in was cancelled." |
| `auth/popup-blocked` | "Your browser blocked the Google sign-in window. Allow popups and try again." |
| `auth/network-request-failed` | "Network error. Check your connection and try again." |
| `auth/operation-not-allowed` | "This sign-in method isn't enabled yet for the app." |
| other `auth/*` | "Sign-in failed. Please try again." |

## AuthContext state machine

`AuthStatus` is `"loading" | "authenticated" | "unauthenticated" | "unconfigured"`
(`src/lib/firebase/AuthContext.tsx:18`). Initial value is `unconfigured` when Firebase is not
configured, otherwise `loading` (`:37`).

```
mount
  |
  +-- not configured -----------------------------> unconfigured (effect returns early)
  |
  '-- configured -> ensureFirebaseAuthReady -> onAuthStateChanged
                                                    |
                        user == null ---------------> unauthenticated
                                                    |  (clears workspaceId, workspace, error)
                        user != null ---------------> loading
                                                    |
                              bootstrapUserWorkspace(user)
                                    |                       |
                                    ok                      error
                                    |                       |
                          workspaceId set,            status = authenticated,
                          status = authenticated       bootstrapError = message
                                    |
                          getWorkspace(workspaceId)  (non-blocking;
                                    |                 failure only logs)
                          workspace set or null
```

Notes verified in the source:

- The subscription effect depends on `bootstrapAttempt`; `retryBootstrap()` increments it,
  which tears down and re-runs the subscription (`:126`-`:130`).
- `workspace` (the document) is loaded *after* `status = authenticated`. A failed identity read
  degrades to the fallback name in the shell rather than blocking (`:83`-`:93`).
- A bootstrap failure does **not** sign the user out: the error is exposed and `AuthGate`
  renders a retry screen (`src/components/AuthGate.tsx:85`).
- `useAuth()` throws when used outside the provider (`src/lib/firebase/AuthContext.tsx:148`).

## Workspace bootstrap

`bootstrapUserWorkspace(user)` (`src/lib/firebase/auth.ts:234`) is called on every auth state
change that yields a user. It is idempotent by construction.

**Step 1 — profile** (`ensureUserProfile`, `:88`). Reads `users/{uid}`. If missing, creates it
with `uid`, `displayName` (Auth name or the email local part), `email`, `photoURL`, timestamps.
If present, only `photoURL` is synchronized from the Auth provider; `displayName` is
user-owned and is never overwritten by bootstrap (comment at `:120`).

**Step 2 — default workspace** (`ensureDefaultWorkspace`, `:155`). The id is deterministic:

```ts
function defaultWorkspaceId(uid: string) { return `default-${uid}`; }
```

If the workspace document exists, bootstrap only repairs a missing
`users/{uid}.defaultWorkspaceId` pointer. Otherwise it commits one `writeBatch` containing:

```
workspaces/default-{uid}                     { id, name: "My Workspace", createdBy, createdAt, updatedAt }
workspaces/default-{uid}/members/{uid}       { uid, role: "owner", displayName, email, createdAt, updatedAt }
users/{uid}                                  { defaultWorkspaceId, updatedAt } (merge)
```

The deterministic id is what makes concurrent first-login attempts safe without a transaction:
two tabs write the same document id with equivalent content, so the loser is a no-op overwrite
(comment at `:142`-`:150`). It is also what the security rules can verify, because rules
evaluate against pre-batch state and cannot read the workspace document created in the same
batch (`firestore.rules:100`-`:108`).

Bootstrap logs each step in development only (`BOOTSTRAP_DEBUG`,
`src/lib/firebase/auth.ts:72`), so a rules rejection can be traced to the exact operation.

## Profile and workspace operations

`src/lib/firebase/workspace.ts`:

- `getWorkspace(workspaceId)` returns a defensive `Workspace` or `null` (`:12`).
- `renameWorkspace(workspaceId, name)` trims, rejects empty and names over 80 characters, and
  writes `{ name, updatedAt }` with merge (`:31`).
- `getUserProfile(uid)` returns a defensively parsed `UserProfile` (`:55`).
- `updateUserDisplayName(uid, name, { workspaceId })` writes the canonical profile first, then
  best-effort syncs the Firebase Auth `displayName` and the workspace member document; both
  secondary writes swallow and log failures (`:86`).

`SettingsPage` uses those functions, then calls `user.reload()` so the navbar reflects the new
name (`src/components/SettingsPage.tsx:89`), and updates the cached workspace document through
`setWorkspace` (`:112`).

## AuthGate

`src/components/AuthGate.tsx:41` renders, in order:

| Condition | Screen |
| --- | --- |
| `status === "loading"` | "Loading ChoirScript..." |
| `status === "unconfigured"` | "Cloud sync isn't configured" with a pointer to `.env.example` |
| `status === "unauthenticated"` | "Sign in to continue" + link to `/login`; also sets `document.title` |
| `bootstrapError` | "Couldn't load your workspace" + Try again + Sign out |
| otherwise | `<MigrationGate>{children}</MigrationGate>` |

It is mounted only by `src/app/(workspace)/layout.tsx:14`, so it covers `/` and `/settings` and
nothing else. The editor and rehearsal routes handle their own loading and are not gated — see
[../architecture/routing-and-state.md](../architecture/routing-and-state.md#known-gaps).

## MigrationGate

`src/components/MigrationGate.tsx:53` withholds the authenticated UI until the legacy
localStorage import finishes. It requires `user` and `workspaceId`; otherwise it stays in
`checking`. Fast path: no `choirscript.songs.v1` key means `complete` with no Firestore access
(`:76`). Otherwise it runs `runLegacyMigrationOnce(workspaceId, uid)` and maps
`failed` to a retry screen or `migrated` to children plus a toast.

Migration guarantees, from `src/lib/firebase/migration.ts`:

- Legacy data is removed only after every cloud write succeeded, and a timestamped backup key
  is written first (`backupLegacyStorage`, `:179`; retirement at `:349`-`:352`).
- ID collisions on first import are imported under a fresh id with " (Imported copy)" appended
  (`:306`-`:313`).
- Progress is fingerprinted against the raw legacy JSON with djb2; a changed source restarts
  the migration instead of silently skipping songs (`:23`, `:82`).
- Each confirmed song is recorded in `choirscript.migration.progress.v1` before the next one,
  so a retry never duplicates (`:326`).
- Per-song failures do not abort the run; the legacy key survives (`:336`-`:346`).
- No global "migration complete" flag: state is per browser, so another device can migrate
  later (`:233` comment).
- It deliberately does not call `loadSongs()`, because that function seeds a demo song and
  would fabricate data to migrate (`:118`-`:123`).

## Firestore rules summary

`firestore.rules` (140 lines, deployed via `firebase.json`) defines:

Helpers (`:21`-`:52`): `isSignedIn`, `isSelf`, `membershipDoc`, `isWorkspaceMember`,
`hasWorkspaceRole`, `isWorkspaceOwner`, `canWriteWorkspaceData`.

| Path | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| `users/{uid}` | self only (`:60`) | self, `uid == auth.uid`, and **no `defaultWorkspaceId` key** (`:64`) | self, immutable `uid` and `createdAt` (`:67`) | denied (`:70`) |
| `workspaces/{workspaceId}` | member, or signed-in user reading `default-{uid}` (`:81`) | only `default-{uid}` with `createdBy == auth.uid` (`:87`) | owner only (`:92`) | denied (`:93`) |
| `workspaces/{id}/members/{memberUid}` | any member (`:99`) | self, role `owner`, only in `default-{uid}` (`:105`) | owner, or self with unchanged `role` (`:111`) | owner may delete self (`:113`) |
| `workspaces/{id}/songs/{songId}` | member (`:119`) | owner, `createdBy == auth.uid` (`:120`) | owner (`:122`) | owner (`:123`) |
| `.../songs/{songId}/document/{docId}` | member (`:128`) | owner (`:129`) | owner (`:129`) | owner (`:130`) |
| everything else | denied (`:136`) | | | |

Design points that are load-bearing:

- **Roles are read from the membership document**, not from custom claims, so future
  admin/editor/viewer roles need no rule rewrite — only `canWriteWorkspaceData` changes
  (`:48`-`:52`).
- **Workspace `list` is denied** (`:86`); the app never needs to enumerate workspaces because
  it always knows `default-{uid}`.
- **Profile creation must omit `defaultWorkspaceId`** because rules treat a missing map key
  differently from `null`; the profile is created first and linked in the second write
  (`:61`-`:66`). This ordering is why bootstrap is two writes for a new user, not one.
- **Deterministic workspace id is the authorization proof** for the first bootstrap, because
  the membership document does not exist yet when rules evaluate the batch.
- Rules call `exists()` / `get()` on membership documents for almost every decision. Firestore
  bills those lookups as document reads, so rule complexity is a cost surface, not only a
  security surface.

## What is not implemented

- No email verification requirement, and no gating on `emailVerified`.
- No multi-workspace UI, invitations, member management, role assignment, or workspace
  deletion. Only `owner` is ever written (`src/lib/firebase/auth.ts:193`).
- No custom claims, no server-side token verification, no admin SDK usage anywhere.
- No account deletion path (rules deny deleting `users/{uid}`).
- No session expiry or re-authentication handling beyond Firebase defaults.

## Related

- Route gating matrix: [../architecture/routing-and-state.md](../architecture/routing-and-state.md#auth-gating-matrix)
- Collections and document shapes: [../backend/README.md](../backend/README.md)
- Bootstrap decision: [../adr/ADR-0010-deterministic-workspace-ids.md](../adr/ADR-0010-deterministic-workspace-ids.md)
