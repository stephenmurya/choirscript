# ADR-0010: Deterministic default workspace ids make bootstrap idempotent

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

After sign-in, the app must guarantee that a user has a profile document, a workspace document,
and an owner membership. This runs on every auth state change, in every tab, including two tabs
signing in simultaneously to a brand-new account.

The obvious implementation (query for the user's workspace, create if missing) has a race: two
concurrent runs both see nothing and both create a workspace. A transaction could serialize it,
but Firestore rules also constrain what can be verified during the first write, because rules
evaluate against pre-batch state and cannot read a workspace document created in the same batch.

## Decision

Derive the default workspace id from the uid:

```ts
function defaultWorkspaceId(uid: string) { return `default-${uid}`; }
```

`ensureDefaultWorkspace` (`src/lib/firebase/auth.ts:155`):

1. Reads `workspaces/default-{uid}`.
2. If it exists, only repairs a missing `users/{uid}.defaultWorkspaceId` pointer.
3. If it does not exist, commits one batch writing the workspace, the owner membership, and the
   profile pointer (`:204`-`:219`).

Because the id is deterministic, concurrent runs target the same document. The loser performs an
idempotent overwrite of identical content rather than creating a duplicate.

The rules use the same derivation as their authorization proof:

- Workspace `get` allows a signed-in user reading `default-{uid}` even without membership
  (`firestore.rules:81`-`:85`).
- Workspace `create` requires `workspaceId == 'default-' + auth.uid` and
  `createdBy == auth.uid` (`:87`).
- Member `create` requires role `owner`, `memberUid == auth.uid`, and the same deterministic
  workspace id (`:105`).

## Consequences

Positive:

- Bootstrap is idempotent without transactions, retry loops, or a uniqueness index.
- Rules can authorize the first write without reading a document that does not exist yet.
- A stale profile pointer self-heals on the next sign-in (`:175`-`:183`).
- Debugging is easier: a user's workspace id is predictable from their uid.

Negative and accepted:

- One user cannot own more than one workspace under this scheme; multi-workspace support needs a
  new id strategy plus rule changes.
- Workspace ids leak the uid, which is not a secret but is a stable identifier.
- The security model depends on the id convention: relaxing `create` to arbitrary ids would
  reopen workspace squatting unless membership creation is redesigned.
- `profile.defaultWorkspaceId` is written by a separate write, so a failure between the two
  leaves a workspace with no pointer; the next bootstrap repairs it.

## Alternatives rejected

- **Random workspace ids plus a uniqueness query.** Racy, and rules cannot verify ownership of a
  workspace created in the same batch.
- **Firestore transaction around create.** Solves the race but not the rules problem: rules still
  see pre-transaction state, so membership creation would be unverifiable.
- **Cloud Function `onCreate` for user provisioning.** Adds deploy surface and latency, and the
  app would still need to wait for provisioning before rendering.

## Evidence

- `src/lib/firebase/auth.ts:142`-`:223`
- `firestore.rules:75`-`:114`
- `src/lib/firebase/AuthContext.tsx:76`-`:108`
