# Planning — Dependency Map

**Purpose:** what blocks what, so that sequencing decisions are mechanical rather than argued.
An arrow means "must exist first".

## The spine

```text
tests + domain package
        │
        ├──► pitch model (octave/accidental)
        │        └──► melisma
        │                └──► solfa compiler ──► My Part / Lyrics only
        │                                   └──► print sheet
        │                                   └──► public page rendering
        │
        └──► SongEditor reducer ──► durable undo
                                 └──► revision diff engine

identity (Better Auth) ──► ownership ──► membership/roles
        │                      │
        │                      ├──► publications (revision-pinned)
        │                      │        ├──► canonical URLs / SEO
        │                      │        ├──► unpublish/suspend
        │                      │        └──► duplicate-to-workspace
        │                      │
        │                      └──► proposals ──► review UI ──► notifications
        │
        └──► organisations ──► services/planning ──► attendance ──► analytics

R2 + Queues ──► AI processing ──► metering ──► Pro tier
                                        └──► marketplace (deferred)
```

## Feature-level table

| Work | Blocked by | Blocks |
| --- | --- | --- |
| Section reorder (C-08) | — | Multi-arrangement sanity (P0-2) |
| Arrangement switcher (C-04) | — | Public arrangement URLs (one arrangement must be selectable) |
| Honest live badge (H-07) | — | Nothing (independent) |
| `noindex` on shares (H-13) | — | Visibility tiers |
| Domain package + tests | — | Pitch model, compiler, reducer, migration validation |
| Pitch model (E-07) | Tests | Melisma, compiler, octave marks, audio playback |
| Melisma (E-08) | Pitch model | Compiler fixtures, realistic SATB |
| Solfa compiler (F-11) | Pitch model, melisma, tests | My Part / Lyrics-only, print sheet, proposal review rendering |
| Print sheet (G-13) | Compiler | PDF export |
| `SongEditor` reducer | Domain package | Durable undo, revision diffs |
| Revision diff engine | Reducer (for clean operation emission), immutable revisions in schema | Proposals |
| Identity migration | OpenNext spike, schema | Ownership records, sessions, membership |
| Ownership records | Identity migration | Membership roles, publications, entitlements |
| Publications (revision-pinned) | Ownership, relational schema | Canonical URLs, SEO, unpublish, duplicate |
| Canonical URLs / SEO | Publications, SSR renderer (compiler), cache rules | Organic acquisition, public library |
| Proposals | Revisions, ownership, notifications | Community contributions, marketplace trust |
| Organisations | Identity | Band management, pooled allowances |
| R2 | Workers spike | AI assets, stems, practice audio |
| Queues/Workflows | Workers spike | AI jobs, notification fan-out |
| Metering | Ownership, jobs | Pro tier, marketplace |

## Circular-looking dependencies, resolved

Two loops appear and both are illusory:

1. **"Print needs the compiler, but the compiler needs melisma, which needs a pitch model."**
   Correct, and that is the intended order. If a print deadline forces it, ship a print layout on
   the *current* note-name model first (Tier 3 item 17 without P2-1/2) and re-derive later — but
   accept that it will be rewritten.
2. **"SEO needs server rendering, which needs the migration, which needs tests."** The compiler is
   the piece that must be pure before it can render on a Worker; tests are what make "pure"
   credible. This is why Phase 1 precedes Phase 3 rather than running alongside it.

## Things that look dependent but are not

| Claim | Reality |
| --- | --- |
| "Live sharing needs the migration" | It already exists on Firebase (ADR-0011). Only *public* publishing needs the move |
| "Multiple arrangements need a schema change" | The array, `activeArrangementId` and resolution already exist |
| "Print needs a server PDF service" | ADR-0009 chose browser print; the compiler improves the output, not the delivery |
| "AI is required for a useful public library" | Public pages are useful with notation alone |
| "Proposals need real-time editing" | Proposals are branches; CRDTs are a different (later) problem |
