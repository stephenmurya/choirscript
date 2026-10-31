# ADR-0001: Client-side auth gating inside a route group

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

The app needs a signed-in shell for the workspace home and settings, but the editor and
rehearsal views use a different, focused chrome. Next.js offers middleware for request-time
redirects, but the identity provider is the Firebase client SDK: the session lives in the
browser and there is no server-readable session cookie in this codebase (`src/lib/firebase/client.ts`
contains no cookie or session handling, and there is no `src/middleware.ts`).

Data access is Firestore from the browser. A route-level redirect would not add protection,
because the data itself is fetched by the client after render.

## Decision

Gate authenticated UI in a client component (`AuthGate`) mounted by a route-group layout:

```
src/app/(workspace)/layout.tsx
  <AuthGate>            // loading / unconfigured / unauthenticated / bootstrap error
    <WorkspaceSongsProvider>
      <AppShell>{children}</AppShell>
```

Routes that need a different chrome (`/songs/[id]`, `/songs/[id]/rehearsal`) sit outside the
group and do their own loading. Public routes (`/s/[shareId]`, `/login`, `/privacy`, `/terms`)
are outside it too.

Authorization for data is left entirely to Firestore rules (`firestore.rules`), which resolve
membership documents per request.

## Consequences

Positive:

- No server session infrastructure, no cookie handling, no token exchange endpoint.
- The workspace chrome persists across `/` and `/settings` without remounting the provider.
- Public snapshot rendering stays possible on the server without any auth dependency.
- Static rendering is not blocked by middleware.

Negative and accepted:

- Signed-out visitors to `/songs/[id]` or `/songs/[id]/rehearsal` are not redirected. Both
  components wait for `workspaceId` from `useAuth()` and render a loading state forever
  (`src/components/SongEditor.tsx:103`, `src/components/RehearsalView.tsx:56`).
- Route protection and data protection are separate mechanisms; a bug in a client component can
  show a shell, but cannot read another workspace's data.
- There is no server-side pre-render of authenticated content.

## Alternatives rejected

- **Next.js middleware with a session cookie.** Requires a server session/token exchange that
  does not exist; the Firebase JS SDK does not expose an HttpOnly cookie by default.
- **Server components reading Firestore with the Admin SDK.** Would require service credentials
  on the server, a new API surface, and duplication of the client repository.
- **Gating every route individually.** Duplicates the state machine and was not done; the known
  loading-state gap is the cost.

## Evidence

- `src/app/(workspace)/layout.tsx:12`-`:19`
- `src/components/AuthGate.tsx:41`-`:110`
- `src/components/SongEditor.tsx:103`-`:157`
- `src/components/RehearsalView.tsx:56`-`:110`
- Absence of `src/middleware.ts`; `next.config.ts` has no redirects.
