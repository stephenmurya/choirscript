# ChoirScript documentation

This directory is the written record of the ChoirScript codebase: what it does, how it is
structured, which decisions produced that structure, what has actually shipped, and what is
only planned.

Verification baseline: commit `a79c7b1` (2026-10-31) plus the uncommitted working tree as read
on the morning of 2026-10-31 (`src/lib/lineText.ts`, `src/lib/syllableSplitter.ts`,
`src/lib/syllableDictionary.ts`, `src/lib/partTransfer.ts`, `src/components/PartTransferMenu.tsx`,
`src/components/LyricLineBlock.tsx`, `src/components/SongEditor.tsx`). The working tree was
actively changing during this pass; the
ledger records the exact files seen. Claims cite `path:line` where the reference is useful. The
code wins over any prose here, including the historical Phase 3A document.

Two conventions matter when reading these docs:

- "Implemented" means the code path exists and is reached by the running app.
- "Planned" means a design intention only. Planned and in-progress work lives in
  `future/README.md`; in-progress items are described only as uncommitted working-tree state,
  never as delivered features.

## Architecture

| Document | Contents |
| --- | --- |
| [architecture/overview.md](architecture/overview.md) | Product scope, stack, repository map, module responsibilities, persistence topology |
| [architecture/data-model.md](architecture/data-model.md) | `Song` aggregate, Source/Arrangement model, timing, annotations, IDs, normalization pipeline, invariants |
| [architecture/routing-and-state.md](architecture/routing-and-state.md) | Every route, layout composition, auth gating matrix, which component owns which state, load/save lifecycles |
| [architecture/rendering-and-print.md](architecture/rendering-and-print.md) | Editor grid, simple vs advanced rehearsal renderers, arrangement resolution, scroll-spy, print pipeline |

## Auth and backend

| Document | Contents |
| --- | --- |
| [auth/README.md](auth/README.md) | Firebase Auth flow, workspace bootstrap, AuthGate/MigrationGate state machines, Firestore rules summary |
| [backend/README.md](backend/README.md) | Firestore collections and document shapes, Blob share pipeline, environment variables, Vercel deployment |

## Decisions

| Document | Decision |
| --- | --- |
| [adr/ADR-0001-client-side-auth-gating.md](adr/ADR-0001-client-side-auth-gating.md) | Gate authenticated UI in client components inside a route group; no middleware |
| [adr/ADR-0002-firestore-system-of-record.md](adr/ADR-0002-firestore-system-of-record.md) | Firestore is the system of record; no server API for song CRUD |
| [adr/ADR-0003-split-song-documents.md](adr/ADR-0003-split-song-documents.md) | Store each song as a metadata document plus a body document |
| [adr/ADR-0004-source-arrangement-model.md](adr/ADR-0004-source-arrangement-model.md) | Canonical Source sections plus Arrangement occurrences (schemaVersion 2) |
| [adr/ADR-0005-single-normalize-boundary.md](adr/ADR-0005-single-normalize-boundary.md) | `normalizeSong()` is the only sanitizer/migration boundary |
| [adr/ADR-0006-immutable-blob-shares.md](adr/ADR-0006-immutable-blob-shares.md) | Share links are immutable JSON snapshots in Vercel Blob |
| [adr/ADR-0007-part-scoped-timing.md](adr/ADR-0007-part-scoped-timing.md) | One canonical line timing with per-part overrides |
| [adr/ADR-0008-orthographic-syllabification.md](adr/ADR-0008-orthographic-syllabification.md) | Hyphenation patterns plus curated exceptions plus manual override |
| [adr/ADR-0009-browser-print.md](adr/ADR-0009-browser-print.md) | Print via `window.print()` and CSS, not server-side PDF |
| [adr/ADR-0010-deterministic-workspace-ids.md](adr/ADR-0010-deterministic-workspace-ids.md) | Default workspace id is `default-{uid}` so bootstrap is idempotent |

## Delivery and plans

| Document | Contents |
| --- | --- |
| [ledger/implementation-ledger.md](ledger/implementation-ledger.md) | Every commit on `master` with SHA and date, what it delivered, what remains unverified |
| [future/README.md](future/README.md) | Planned work: per-line/per-section parts, part transfer, global syllable dictionary, backend migration |

## Historical input

| Document | Status |
| --- | --- |
| [phase-3-source-arrangement-architecture.md](phase-3-source-arrangement-architecture.md) | Phase 3A design document (2026-09-05). Historically important, partially superseded by implementation. Drift is catalogued in [architecture/data-model.md](architecture/data-model.md#drift-from-the-phase-3a-document) and [architecture/rendering-and-print.md](architecture/rendering-and-print.md#drift-from-the-phase-3a-document). |

## Known gaps at a glance

These are recorded in detail in the ledger and the relevant architecture documents:

- No automated test suite and no CI. `scripts/phase3-validation.ts` and
  `scripts/phase3d-validation.ts` are manual `node:assert` scripts with no runner, no npm
  script, and no CI invocation.
- `.gitignore` ignores `.env*`, which also excludes `.env.example`; the template exists on
  disk but is not tracked by git.
- 11 components in `src/components/` are never imported (listed in
  [architecture/overview.md](architecture/overview.md#dead-code)).
- `README.md` at the repository root is untouched create-next-app boilerplate.
- The editor and rehearsal routes are outside the auth gate; an unauthenticated deep link
  renders a permanent loading state rather than redirecting to `/login`
  ([architecture/routing-and-state.md](architecture/routing-and-state.md#known-gaps)).
