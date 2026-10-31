# ADR-0002: Firestore is the system of record; no server API for song CRUD

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

The app is a single-user-per-workspace (today) editor with autosave. It needs low-latency reads
and writes from the browser, offline tolerance is desirable, and there is no requirement for
cross-client consistency beyond last-write-wins. The team already chose Firebase for auth.

A conventional Next.js backend (route handlers + database client) would add a server hop to
every keystroke burst, plus a second authorization implementation alongside Firestore rules.

## Decision

The browser talks to Firestore directly through the Firebase client SDK. The repository layer
is `src/lib/firebase/songs.ts`, called from React components. No Next.js route handler or server
action performs song CRUD. Firestore rules are the sole authorization boundary.

The only server-side data paths are the share snapshot writer and reader
(`src/app/api/share/route.ts`, `src/app/s/[shareId]/page.tsx`), which do not touch Firestore.

## Consequences

Positive:

- One authorization model (rules) instead of two.
- No API surface to version, rate-limit, or secure separately for song data.
- Autosave is a direct SDK call; latency is Firestore's, not an extra hop.
- The client can render optimistic UI and roll back locally
  (`src/components/WorkspaceSongsContext.tsx:200`).

Negative and accepted:

- Rules become production code with no test harness in the repo; a rules regression is only
  caught in staging or production.
- Client bundles include Firebase and the whole domain layer; there is no server-rendered song
  content.
- Any future server-side feature (email digests, PDF rendering, collaboration) either needs the
  Admin SDK or a new API layer.
- Rule helper lookups (`exists`/`get` on membership) are billed reads on every operation.

## Alternatives rejected

- **Route handlers wrapping Firestore.** Adds a hop and a second auth check without removing the
  need for rules, since clients could still reach Firestore unless rules were locked to the
  Admin SDK.
- **A separate relational database.** No requirement in the code or docs justifies it, and the
  aggregate is document-shaped.

## Evidence

- `src/lib/firebase/songs.ts` (all exports use the Firestore SDK directly)
- `src/components/SongEditor.tsx:32` imports the repository into a client component
- `src/app/api/share/route.ts` has no Firestore import
- `firestore.rules:118`-`:132` (song rules)
