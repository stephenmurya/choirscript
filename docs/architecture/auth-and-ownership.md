# Architecture — Auth and Ownership

**Purpose:** what identity is today, what it must become, and how users survive the move without
losing their songs. This is the highest-risk migration in the project: content is cheap to move,
identity is not.

## Current implementation (verified)

| Concern | Today |
| --- | --- |
| Provider | Firebase Auth 12 (Identity Platform under the hood) |
| Methods | Google popup with redirect fallback (`auth.ts:257`), email/password (`:287`), password reset |
| Session | Firebase ID token, refreshed by the SDK; no server-side session |
| Gating | Client-side only (ADR-0001). Routes render and then redirect; rules enforce data access |
| Identity key | Firebase `uid` — opaque, provider-scoped, not portable |
| Workspace | Deterministic id `default-{uid}` (ADR-0010), created on first bootstrap |
| Membership | `workspaces/{wid}/members/{uid}` with `role`; only `owner` is ever written |
| Profile | `users/{uid}` ({displayName, email, createdAt}) |
| Deletion | Not possible — rules deny `delete` on `users/{uid}` and `workspaces/{id}` |

Consequences that matter for planning:

- **`uid` is embedded in the URL of every song:** `workspaces/default-{uid}/songs/{songId}`. Any
  migration must map old workspace paths to new owner ids, not just re-key user rows.
- **Passwords cannot be migrated.** Firebase stores a scrypt-derived hash in its own format.
  Better Auth cannot verify those hashes. Email/password users must either reset their password
  or be signed in once via a migration exchange. Google-linked users can be re-linked by email
  with far less friction.
- **Content ownership is implicit.** There is no `ownerId` field on songs beyond the workspace
  path. A relational schema must make ownership explicit so it can be queried, transferred and
  attributed.

## Target (`docs/architecture/infrastructure-target.md`)

Better Auth + Neon PostgreSQL + Drizzle, with organisations. Better Auth gives: email/password,
OAuth providers, sessions in Postgres, email verification, and an organisation plugin with roles
and invitations.

## Identity migration strategy

The only acceptable outcome: **no user loses access to a song, and no song loses an owner.**

### Phase 0 — Prepare (before any move)

1. Add `ownerId` to the relational schema and populate it from the workspace path during import.
2. Export every Firebase user (`uid`, email, displayName, providers, createdAt) to a mapping table
   using the Admin SDK. This is the first time the project needs a service account; treat it as
   a one-off, least-privilege, read-only credential.
3. Decide the account-continuity policy per provider:
   - **Google** → match on verified email, link the Google account, no user action.
   - **Email/password** → create the user with a "reset required" flag; send a signed,
     single-use set-password link. Do **not** attempt to import hashes.
4. Reserve `legacyUid` on the new user row so support can resolve "where did my song go".

### Phase 1 — Dual-write / shadow mode

New sign-ups go to Better Auth. Existing users are migrated lazily on first sign-in: the login
endpoint accepts Firebase credentials through the Firebase REST API once, then mints a session in
Better Auth and attaches the legacy uid. This avoids a big-bang cutover and avoids emailing every
user at once.

### Phase 2 — Cutover

- Freeze writes in the Firebase app during a short window (read-only banner).
- Export all workspaces, songs, summaries, memberships, share tokens.
- Import into Postgres with `legacyUid` preserved and `ownerId` resolved.
- Re-point DNS to the new deployment. Keep `/s/{shareId}` working via a compatibility route that
  reads migrated share rows.

### Phase 3 — Retire

- Keep the Firebase project read-only for a defined period (recommend 90 days) as a rollback path
  and a source for late sign-ins.
- Only after that period, delete tokens and archive the export.

### Rollback

Every phase must be reversible without data loss: the Firebase project stays authoritative until
Phase 2 completes, and the import is idempotent (re-runnable by `legacyUid`).

## Ownership model to implement

| Entity | Owner | Notes |
| --- | --- | --- |
| Workspace / organisation | One user, transferable | Membership rows carry role |
| Song | Workspace | A song belongs to a workspace, not directly to a user |
| Arrangement | Song, with `createdBy` | Duplication credits `createdBy` and records `attribution` |
| Publication | Arrangement | Publishing does not transfer ownership |
| Revision | Arrangement | Immutable; carries `authorId` |
| Media asset | Arrangement or organisation | See `asset-rights-and-storage.md` |

Rules to enforce in the app **and** the database (not only in the UI):

1. A user can read a song iff they hold a membership in its workspace, or the song has a
   published public/unlisted arrangement.
2. A user can write a song iff their membership role is `owner` or `editor` **and** the
   arrangement is not under review by a proposal.
3. Only `owner` can publish, unpublish, delete, transfer or invite.
4. A proposal author can edit their proposal's branch only.
5. Anonymous visitors can read public/unlisted content and nothing else.

## Security notes

- The current client-side gating (ADR-0001) is acceptable because rules are the real gate. In the
  target, do not reproduce "render then redirect": verify the session server-side in a middleware
  or route handler and return 401/403.
- Share tokens (`editToken`) live in Blob and on the song document. In the target they belong in
  a `publication_secrets` table, hashed, never returned to viewers. A leaked token currently
  allows republishing someone's link; the target should scope tokens and allow rotation.
- Sessions must be httpOnly cookies, `SameSite=Lax`, with CSRF protection on mutations.

## Open questions

1. Do we keep Google sign-in only for launch of the new stack, deferring email/password until the
   reset flow is proven? (Recommendation: keep both, but drive existing email users through a
   forced reset rather than a silent failure.)
2. Should workspaces and organisations be the same table? (Recommendation: one `organisations`
   table with a `kind` of `personal` or `team` — it keeps membership logic single-path.)
3. How long is the rollback window? (Recommendation: 90 days, documented in the migration plan.)
