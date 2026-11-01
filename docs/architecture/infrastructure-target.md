# Architecture — Infrastructure Target

**Purpose:** the agreed destination stack and the constraints it imposes. This document is a
**direction**, not a schedule; implementation detail belongs in `migration-plan.md`.

## Target table

| Layer | Target | Replaces |
| --- | --- | --- |
| Web application | Next.js + TypeScript (App Router) | Same |
| Hosting | Cloudflare Workers via OpenNext | Vercel |
| Relational database | Neon PostgreSQL | Firestore |
| ORM | Drizzle | None (Firebase SDK) |
| Authentication | Better Auth | Firebase Auth |
| Organisations | Better Auth organisation plugin + product permissions | Hand-rolled membership docs |
| Object storage | Cloudflare R2 | Vercel Blob |
| Background processing | Cloudflare Queues | None |
| Scheduling | Cloudflare Cron Triggers | None |
| Durable workflows | Cloudflare Workflows (selectively) | None |
| Transactional email | Resend | Firebase's default |
| AI processing | External providers (Music AI/Moises, MVSEP) | None |
| Administration | Murya via authenticated internal APIs | None |

## Why each move

- **Vercel → Workers.** Cost per request and cold-start behaviour on a content site that wants to
  be crawled. Workers also colocate with R2 and Queues, removing an egress bill for audio.
- **Firestore → Neon.** Publishing, revisions, membership and metering are relational questions
  (joins, counts, uniqueness on slugs) that a document store makes expensive or impossible.
  Postgres also gives real transactions for publish + sitemap + notification.
- **Firebase Auth → Better Auth.** Sessions in the same database as content, self-hosted,
  organisation roles, and no vendor lock on identity. It also removes the awkward split where
  the client is trusted and rules do the real work.
- **Blob → R2.** Share payloads, plus the audio that AI processing will produce. No egress fees
  is the decisive property for rehearsal playback.
- **Queues/Cron/Workflows.** AI jobs and scheduled publication work cannot run inside a request.
- **Resend.** Publication notifications, proposals, invitations, password resets.

## Constraints the target imposes (plan against these now)

1. **No `firebase-admin` in Workers.** Anything requiring privileged access needs an explicit
   service (a Worker with a binding), not an admin SDK smuggled into the app.
2. **Edge runtime limits.** No Node built-ins in Workers; `@vercel/blob` and Firebase client SDK
   do not carry over. Keep storage and data access behind small modules (a repository layer) so
   the swap is mechanical.
3. **Drizzle + Neon over HTTP.** Use the serverless driver; avoid long-lived pools inside Workers.
4. **OpenNext compatibility.** Verify the Next.js 16 features in use (App Router streaming, route
   handlers, middleware) against the current OpenNext adapter before committing to a cutover
   date. This is the highest technical risk in the move and must be spiked early.
5. **Cache keys must include publication revision**, or stale pages will outlive an unpublish.
6. **No direct database coupling with Murya.** Choirscript owns its schema; Murya talks to
   authenticated internal APIs for plans, usage, allowances and health.

## Repository layering to enable the swap

The migration is cheap or expensive depending on how much provider detail leaks into components.
Target layering, achievable today without changing behaviour:

```text
components/        pure UI, receives data + callbacks
hooks/             orchestration (useSongEditor, usePublish, useRehearsal)
domain/            pure musical logic (arrangement, timing, notation compiler) — no I/O
repositories/      one module per backend concern (songs, publications, membership, assets)
platform/          provider adapters (Firebase now, Drizzle/Neon later)
```

The important rule: **nothing above `repositories/` imports a provider SDK.** Today
`SongEditor` imports `@/lib/firebase/songs` directly; that is acceptable now but must not spread.

## Patterns worth reusing from the sibling projects

Inspect Cuelio and Murya before writing the new Worker code — they already solved deployment,
internal-auth and admin-API conventions on this stack. Do not assume their dependencies; read
them.

## Open decisions

| Question | Options | Recommendation |
| --- | --- | --- |
| One repo or a workspace? | Monorepo with `apps/web` + `packages/domain` | Monorepo: the notation compiler and domain logic will be used by web, jobs and tests |
| Where does the compiler live? | Inside web, or a standalone package | Standalone package with zero dependencies; it is the most testable and most reusable asset |
| Session strategy | Database sessions vs JWT | Database sessions (revocable, single source of truth) |
| Public page rendering | SSR per request vs static + revalidate | Static per publication revision with tag revalidation |
| Cron granularity | Hourly vs per-minute | Hourly for housekeeping; publication is event-driven, not scheduled |
