# Planning — Implementation Roadmap

**Purpose:** the staged plan with acceptance criteria, in dependency order. Work items use the
feature IDs from `../product/features.md`; where an item is pre-existing and DONE it appears only
as a milestone dependency, not as work.

**Backend migration required?** — `no` means it can ship on Vercel + Firebase as-is; `yes` means it
needs the target stack; `partial` means a reduced version can ship earlier and be extended later.

---

## Phase 0 — Close the cheap gaps (1–2 weeks)

Everything here is small, user-visible and independent of the migration.

| ID | Work | Status | Depends on | Backend | Value | Complexity | Files | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Section reorder (C-08) | NOT STARTED | — | no | High | S | `songStorage.ts`, `SongEditor.tsx`, `LyricLineBlock.tsx` | Sections move by drag or buttons; occurrences unaffected; undoable |
| P0-2 | Arrangement switcher (C-04) | NOT STARTED | P0-1 | no | High | M | `ArrangementEditor.tsx`, `SongEditor.tsx`, `arrangement.ts` | Create/rename/duplicate/delete/switch; active arrangement drives rehearsal; ids stable |
| P0-3 | Honest live badge (H-07) | NOT STARTED | — | no | Medium | XS | `SharedSongLive.tsx` | `/rev` 404 → `Snapshot from …`, no live UI |
| P0-4 | `noindex` on share links (H-13) | NOT STARTED | — | no | Medium | XS | `src/app/s/[shareId]/page.tsx` | `robots: { index: false }` present |
| P0-5 | Visible save/publish failure (J-10) | NOT STARTED | — | no | Medium | S | `SongEditor.tsx`, `EditorShell.tsx` | Banner with retry; header shows publish state |
| P0-6 | Performer suggestions on the song (G-06) | NOT STARTED | — | no | Low | S | `performerLabels.ts`, `ArrangementEditor.tsx` | Suggestions follow the user across devices |

**Exit criteria:** a director can reorder sections and keep two arrangements of one song; a frozen
link no longer claims to be live.

## Phase 1 — Testable musical core (2–4 weeks)

| ID | Work | Status | Depends on | Backend | Value | Complexity | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | Domain package extraction | NOT STARTED | Phase 0 | no | Enabler | M | Pure modules move; `tsc`/`eslint` clean; no behaviour change |
| P1-2 | Test harness + suites | NOT STARTED | P1-1 | no | Enabler | M | `npm test` runs; suites cover syllabification, timing arithmetic, arrangement resolution, duplication/remap, normalisation |
| P1-3 | `validateSong` diagnostics (C-07) | NOT STARTED | P1-1 | no | Medium | M | Reports orphaned timing/annotations/occurrences; a dev panel lists them; no silent repair |
| P1-4 | `SongEditor` → reducer + hooks | NOT STARTED | P1-1 | no | Enabler | L | Mutations move onto a reducer; undo still works; file shrinks meaningfully |

**Exit criteria:** the musical engine can be changed with tests instead of hope.

## Phase 2 — Notation and the rehearsal experience (4–8 weeks)

This is the phase that changes what the product *is*.

| ID | Work | Status | Depends on | Backend | Value | Complexity | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-1 | Pitch model: octave + accidental (E-07) | NOT STARTED | P1-2 | no | High | L | Model + migration + editor input; old songs unchanged |
| P2-2 | Melisma (E-08) | NOT STARTED | P2-1 | no | High | L | Multiple notes per syllable per part; rehearsal and timing consistent |
| P2-3 | Tonic-solfa compiler (F-11) | NOT STARTED | P2-1, P2-2 | no | Very high | XL | Fixtures pass; renders scores with barlines, holds, rests, octave marks; behind a flag until it matches the pen test |
| P2-4 | Compound meter grouping (F-08) | NOT STARTED | P1-2 | no | Medium | M | 6/8 grouped in two; compiler and beat labels agree |
| P2-5 | "My Part" + lyrics-only modes (G-10, G-11) | NOT STARTED | P2-3 | no | High | M | Modes are compile options; remembered per user |
| P2-6 | Print sheet (G-13) | NOT STARTED | P2-3 | no | High | L | Aligned systems, page breaks, header; PDF-checked |
| P2-7 | Phone line fit (G-08b) | NOT STARTED | P2-3 | no | High | M | 16-syllable line readable at 390 px without horizontal scroll |

**Exit criteria:** a singer on a phone reads traditional tonic-solfa without rotating the device,
and a printed sheet looks like a sheet.

## Phase 3 — Infrastructure move (see `../architecture/migration-plan.md`)

| ID | Work | Status | Depends on | Backend | Acceptance |
| --- | --- | --- | --- | --- | --- |
| P3-1 | OpenNext/Workers spike | NOT STARTED | Phase 2 | yes | Staging app serves `/s/{id}` from R2 + Neon; incompatibilities documented |
| P3-2 | Neon schema + Drizzle + import | NOT STARTED | P3-1, P1-1 | yes | Validation gates 1–6 pass on a full export |
| P3-3 | R2 storage with dual-read | NOT STARTED | P3-1 | yes | Every existing share link resolves |
| P3-4 | Better Auth shadow mode | NOT STARTED | P3-2 | yes | Google users linked; password users reset; `legacy_uid` preserved |
| P3-5 | Cutover + 90-day rollback | NOT STARTED | P3-2..4 | yes | DNS switched; synthetic checks green |

**Exit criteria:** no user lost access; every link still resolves; rollback rehearsed.

## Phase 4 — Ownership, publication and SEO (the acquisition loop)

| ID | Work | Status | Depends on | Backend | Note |
| --- | --- | --- | --- | --- | --- |
| P4-1 | Membership UI + roles (A-06) | NOT STARTED | P3-4 | yes | Rules already read `role`; the app must write and enforce it |
| P4-2 | Publication model + revisions | NOT STARTED | P3-2 | yes | `publications`, `publication_revisions`, rights declaration |
| P4-3 | Canonical pages + slugs + redirects | NOT STARTED | P4-2 | yes | `/songs/{slug}`, `/songs/{slug}/arrangements/{slug}`; `/s/{id}` 301 |
| P4-4 | SEO surface | NOT STARTED | P4-3 | yes | SSR content, JSON-LD, sitemap, robots, canonical tags |
| P4-5 | Unpublish / suspend (H-08) | NOT STARTED | P4-2 | yes | Instant suspension, tombstone page, cache invalidation |
| P4-6 | Duplicate-to-workspace | NOT STARTED | P4-3 | yes | One click, attribution preserved, signup gate at save |

**Exit criteria:** a stranger finds an arrangement in search, reads it, prints it, duplicates it and
signs up — all measured.

## Phase 5 — Community contributions

| ID | Work | Status | Depends on | Backend |
| --- | --- | --- | --- | --- |
| P5-1 | Revision diff engine | NOT STARTED | P4-2 | yes |
| P5-2 | Proposals + review UI | NOT STARTED | P5-1 | yes |
| P5-3 | Notifications (Resend) | NOT STARTED | P5-2 | yes |
| P5-4 | Attribution on public pages | NOT STARTED | P5-2 | yes |

## Phase 6 — Organisation tier

People, services, planning, attendance, development, analytics. See
`../future/band-management.md`. Depends on P3 (identity/orgs) and P4 (arrangements to assign).

## Phase 7 — AI processing

See `../future/ai-processing.md`. Depends on P3 (queues, R2) and metering (P6 or a minimal ledger).

## Phase 8 — Marketplace

Deferred. See `../future/marketplace.md`.

---

## Critical path

```text
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
                │                        │
                └── tests ───────────────┘  (nothing in Phase 3 is safe without Phase 1)
```

Two deliberate severabilities:

- **Phase 0 stands alone.** It can ship this week and makes the product better regardless of
  everything else.
- **Phase 2 does not need Phase 3.** Notation and rehearsal improvements are pure client work; a
  director never has to wait for the migration to get a better rehearsal view.

## Recommended first milestone

Phase 0, in full: six small items, one release, no schema change, no infrastructure risk. It closes
the gaps a user would notice today (frozen links claiming to be live, no section reorder, one
arrangement only, invisible failures) and it establishes the release cadence the later phases need.
