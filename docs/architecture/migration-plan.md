# Architecture — Migration Plan

**Purpose:** how to move off Vercel + Firestore + Firebase Auth + Vercel Blob without losing data
or users. **Status: NOT STARTED.** Nothing here has been executed; every number is an estimate to
be replaced by measurement during the spike.

## Ordering principle

Move what is cheap and reversible first, and never move identity and content in the same step.

```text
0. Spike        OpenNext on Workers with this app (read-only pages)
1. Domain       Extract pure domain + compiler into a package (no behaviour change)
2. Schema       Neon schema + Drizzle + import scripts, verified against a full export
3. Storage      R2 for share payloads, dual-read against Blob
4. Auth         Better Auth in shadow mode, lazy migration on sign-in
5. Cutover      Freeze writes, final export/import, DNS switch, 90-day rollback window
6. Jobs         Queues/Workflows for AI + notifications (only when features need them)
```

Steps 1–3 can ship behind the current UI without any user-visible change; that is the point.

## 0. Spike (1–2 weeks, throwaway)

Answer before committing:

- Does this Next.js 16 app build and run under OpenNext on Workers, including route handlers and
  the `/s/[shareId]` server component?
- Does the notation/rehearsal bundle behave at the edge (no Node built-ins)?
- What is the cold-start and TTFB difference for a public page?

Exit criteria: a deployed preview serving `/s/{id}` from R2 + Neon in a staging environment, with
a documented list of incompatibilities. If OpenNext cannot carry the app, that is a stop signal:
fix the blocker or reconsider the host — do not start the data migration.

## 1. Domain extraction (behaviour-preserving)

- Move `src/lib/arrangement.ts`, `timing.ts`, `notation.ts`, `syllableSplitter.ts`,
  `annotationUtils.ts`, `lineText.ts` and the future compiler into `packages/domain`.
- Add the first real tests here (see `../planning/pre-migration-improvements.md`); domain code is
  where tests pay for themselves.
- No component changes beyond import paths.

## 2. Schema and import

Deliverables: `schema.ts` (Drizzle), generated migrations, `scripts/import-firestore.ts`,
`scripts/validate-import.ts`.

| Firestore | Postgres |
| --- | --- |
| `users/{uid}` | `users` (+ `legacy_uid`, `email`, `display_name`, `providers`) |
| `workspaces/{wid}` | `organisations` (`kind='personal'`) |
| `workspaces/{wid}/members/{uid}` | `memberships` (`role`) |
| `workspaces/{wid}/songs/{songId}` | `songs` (+ summary columns) |
| `.../document/current` | `song_documents` (jsonb) → normalised child tables |
| `users/{uid}` + doc | `songs.created_by`, `songs.owner_id` |
| `song.share` | `publications` + `publication_secrets` (hashed token) |
| `shares/{id}.json` | `publication_revisions.snapshot` (jsonb) |
| `shares/{id}.rev.json` | `publication_revisions.revision` |
| `shareHeads/{id}` | not migrated — see "Live updates" below |

Two-pass import: raw JSON first into a staging table, then normalised inserts. Never import
directly into the live schema; validation runs against staging.

**Validation gates** (all must pass before cutover):

1. Row counts per collection match the export (±0).
2. Every song has an owner and a resolvable workspace.
3. Every occurrence references a section that exists in the same song.
4. Every timing event references an existing line; syllable references resolve or are reported.
5. Random sample of 25 songs: compiled/rehearsed output matches the Firebase version line by
   line, checked by a human, not only by a script.
6. Every share link resolves to a published revision.

## 3. Storage (R2)

- Layout: `publications/{publicationId}/{revisionId}.json`,
  `publications/{publicationId}/assets/{assetId}/{filename}`.
- Dual-read during the transition: R2 first, Blob on miss, then backfill.
- Keep `/s/{shareId}` working through a compatibility layer that maps id → publication row.

## 4. Auth (Better Auth, shadow mode)

Detailed in `auth-and-ownership.md`. Key properties: lazy migration at sign-in, Google matched by
verified email, email/password users forced through a set-password link, `legacy_uid` preserved.

## 5. Cutover

1. Announce a read-only window (recommend 30–60 minutes at a low-traffic hour).
2. Freeze writes in the Firebase app (banner + rules deny writes for non-admins).
3. Final incremental export; run the import again (idempotent by `legacy_uid` + song id).
4. Run validation gates.
5. Switch DNS / deployment; verify `/s/{id}`, `/songs/{id}`, sign-in, publish.
6. Keep Firebase read-only for 90 days.

## 6. Rollback

| Stage | Rollback |
| --- | --- |
| 0–3 | Nothing user-visible; revert the deploy |
| 4 | Disable Better Auth flag; Firebase remains authoritative |
| 5 | DNS back to Vercel within the window; export from Postgres and replay any writes made after the freeze (there should be none if the freeze held) |

The import must be idempotent and re-runnable, or the rollback path is fiction.

## Live updates after the move

The Firestore doorbell disappears with Firestore. Options:

| Option | Cost | Fit |
| --- | --- | --- |
| Poll `/api/publications/{id}/rev` every 15–30 s on the *share* page only | Near zero | Simplest; acceptable because share pages are short-lived previews |
| SSE from a Worker | Billed while held | Avoid on Vercel-style billing; Workers support SSE but connections are long-lived |
| Durable Object per publication | Per-object cost, explicit fan-out | Correct choice when real-time collaboration arrives |

Recommendation: **polling on the share alias, no live updates on the public page** (it is
server-rendered and cached by revision). Reintroduce push when collaboration needs it, not before.

## Safety requirements

- Backups: a full Firestore export immediately before the freeze, stored off-account.
- Secrets: new service account scoped read-only for export; deleted after cutover.
- Observability: error tracking and a synthetic check on `/s/{publicShareId}` and one public page.
- Cost monitoring: alert on Worker invocations, DB compute hours, and R2 egress (should stay ~0).
- Communication: a status page or at minimum an in-app banner with a date and a rollback promise.

## Explicitly not part of the migration

- AI processing, band management, marketplace, payments.
- Rebranding.
- Editor redesign. If the editor needs restructuring (it does — see `core-editor.md`), do it
  **before** the move so the migration is not also a product change.
