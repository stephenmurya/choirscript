# ChoirScript documentation

This directory is the written record of the ChoirScript codebase: what it does, how it is
structured, which decisions produced that structure, what has actually shipped, and what is
only planned.

Verification baseline: commit `b6eb796` (2026-11-01). Everything described as done is committed
and deployed; there is no uncommitted working set. Claims cite `path:line` where the reference is
useful, but behaviour and file paths are the durable part — line numbers rot. The code wins over
any prose here, including the historical Phase 3A document.

**Source of truth.** Three documents, each answering a different question:

| Question | Document |
| --- | --- |
| Does this feature exist, and how complete is it? | [product/features.md](product/features.md) — the status table |
| What happened, in what order, with what evidence? | [ledger/implementation-ledger.md](ledger/implementation-ledger.md) |
| Why is it built this way, and what comes next? | [planning/decision-log.md](planning/decision-log.md) and `architecture/` |

Status vocabulary, used identically in every document:

| Status | Meaning |
| --- | --- |
| **DONE** | Implemented, reachable, observed working |
| **INCOMPLETE** | Exists but a user-facing part is missing |
| **NOT STARTED** | No implementation; may be designed here |
| **DEFERRED** | Explicitly postponed by the owner |
| **SUPERSEDED** | Replaced by a newer decision |

"Planned" is never used as a status — it hides the difference between "we agreed" and "we wrote
code". Proposals are marked Proposed in the decision log until the owner accepts them.

## Documentation contract

Documentation is part of a change, not a follow-up task. A commit that changes behaviour,
structure, or a decision is incomplete until the docs match it — in the same commit.

| If the change… | Update |
| --- | --- |
| ships, fixes, or removes user-visible behaviour | `ledger/implementation-ledger.md`: a commit-inventory row plus a short narrative entry (what, why, what was verified, what was not) |
| changes or supersedes an architectural decision | a new `adr/ADR-00NN-<slug>.md`; never silently edit an accepted ADR's decision — supersede it and say so in the old one |
| changes structure (new/removed modules, moved responsibility, new route, new collection) | the matching file in `architecture/` or `backend/` |
| adds a Firestore rule, field, index, or collection | `backend/README.md` (rules summary + data model) |
| finds a root cause that cost real time | the ledger, as a concrete gotcha: symptom, cause, fix |
| leaves something unverified | the ledger, explicitly, under "Unverified" — never imply verification that did not happen |

Rules of thumb: write it while you can still see it; say how something was verified rather than
that it was ("0 requests over 20 s idle at 390 px" beats "verified"); record the negative space
(known gaps, deliberate omissions); and never let a docs claim outlive its code — a confident
wrong doc is worse than none. `docs/adr/` is the decision log, the ledger is the work log; do not
duplicate a decision across both.

## Product

| Document | Contents |
| --- | --- |
| [product/vision.md](product/vision.md) | What the product is, where it is going, and the principles that constrain the work |
| [product/features.md](product/features.md) | **The status inventory** — every feature with DONE / INCOMPLETE / NOT STARTED, evidence, and the round-up list of incomplete work |
| [product/user-roles.md](product/user-roles.md) | Owner / editor / contributor / viewer / anonymous, the target permission matrix, and what exists today |
| [product/tiers-and-monetization.md](product/tiers-and-monetization.md) | Free / Pro / Organization, metering primitives, and why nothing is priced yet |

## Architecture

| Document | Contents |
| --- | --- |
| [architecture/overview.md](architecture/overview.md) | Product scope, stack, repository map, module responsibilities, persistence topology |
| [architecture/data-model.md](architecture/data-model.md) | `Song` aggregate, Source/Arrangement model, timing, annotations, IDs, normalization pipeline, invariants |
| [architecture/routing-and-state.md](architecture/routing-and-state.md) | Every route, layout composition, auth gating matrix, which component owns which state, load/save lifecycles |
| [architecture/rendering-and-print.md](architecture/rendering-and-print.md) | Editor grid, simple vs advanced rehearsal renderers, arrangement resolution, scroll-spy, print pipeline |
| [architecture/current-state.md](architecture/current-state.md) | Verified map: stack, routes, request/data flow, editor composition, structural debt |
| [architecture/domain-model.md](architecture/domain-model.md) | Entities, invariants, deliberate gaps, and the schema additions the compiler and publication need |
| [architecture/core-editor.md](architecture/core-editor.md) | The editing pipeline, live component chain, dead surfaces, and the work that belongs here |
| [architecture/tonic-solfa-engine.md](architecture/tonic-solfa-engine.md) | The `SolfaScore` compiler design, rendering conventions, rehearsal modes, test fixtures |
| [architecture/auth-and-ownership.md](architecture/auth-and-ownership.md) | Firebase Auth today, Better Auth target, identity migration, ownership model |
| [architecture/publication-and-seo.md](architecture/publication-and-seo.md) | Public page IA, visibility tiers, structured data, crawl policy, acquisition loop |
| [architecture/contributions-and-revisions.md](architecture/contributions-and-revisions.md) | Revisions, proposals, musical diffs, conflict handling |
| [architecture/infrastructure-target.md](architecture/infrastructure-target.md) | Workers/Neon/Drizzle/Better Auth/R2 target and the constraints it imposes |
| [architecture/migration-plan.md](architecture/migration-plan.md) | Staged migration, validation gates, rollback |
| [architecture/asset-rights-and-storage.md](architecture/asset-rights-and-storage.md) | Asset classes, rights declarations, R2 layout, takedowns |

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
| [adr/ADR-0006-immutable-blob-shares.md](adr/ADR-0006-immutable-blob-shares.md) | ~~Share links are immutable JSON snapshots in Vercel Blob~~ — superseded by ADR-0011 |
| [adr/ADR-0007-part-scoped-timing.md](adr/ADR-0007-part-scoped-timing.md) | One canonical line timing with per-part overrides |
| [adr/ADR-0008-orthographic-syllabification.md](adr/ADR-0008-orthographic-syllabification.md) | Hyphenation patterns plus curated exceptions plus manual override |
| [adr/ADR-0009-browser-print.md](adr/ADR-0009-browser-print.md) | Print via `window.print()` and CSS, not server-side PDF |
| [adr/ADR-0010-deterministic-workspace-ids.md](adr/ADR-0010-deterministic-workspace-ids.md) | Default workspace id is `default-{uid}` so bootstrap is idempotent |
| [adr/ADR-0011-live-share-links.md](adr/ADR-0011-live-share-links.md) | Share links are a moving head, pushed to viewers by a Firestore doorbell (supersedes ADR-0006) |

## Delivery and plans

| Document | Contents |
| --- | --- |
| [ledger/implementation-ledger.md](ledger/implementation-ledger.md) | Every commit on `master` with SHA and date, what it delivered, what remains unverified |
| [planning/pre-migration-improvements.md](planning/pre-migration-improvements.md) | The ranked menu of work worth doing before the infrastructure move |
| [planning/implementation-roadmap.md](planning/implementation-roadmap.md) | Phases P0–P8 with acceptance criteria, complexity and backend dependency |
| [planning/dependency-map.md](planning/dependency-map.md) | What blocks what, and the dependencies that only look circular |
| [planning/risks-and-open-questions.md](planning/risks-and-open-questions.md) | Ranked risks, open questions with recommendations, and planning-vs-code discrepancies |
| [planning/decision-log.md](planning/decision-log.md) | Every decision with status, including rejected alternatives |
| [future/README.md](future/README.md) | Index of future modules |

## Future modules

| Document | Module |
| --- | --- |
| [future/ai-processing.md](future/ai-processing.md) | Audio import, stem and SATB separation, pitch tracking, job economics |
| [future/band-management.md](future/band-management.md) | People, services, repertoire planning, attendance, development, analytics |
| [future/public-library.md](future/public-library.md) | Canonical songs, browse/search, creator pages, moderation |
| [future/marketplace.md](future/marketplace.md) | Deferred: listings, licences, entitlements, payouts |

## Historical input

| Document | Status |
| --- | --- |
| [phase-3-source-arrangement-architecture.md](phase-3-source-arrangement-architecture.md) | Phase 3A design document (2026-09-05). Historically important, partially superseded by implementation. Drift is catalogued in [architecture/data-model.md](architecture/data-model.md#drift-from-the-phase-3a-document) and [architecture/rendering-and-print.md](architecture/rendering-and-print.md#drift-from-the-phase-3a-document). |

## Known gaps at a glance

Verified on 2026-11-01; details in [product/features.md](product/features.md) and the ledger.

- **No automated tests and no CI.** No test runner, no `test` script in `package.json`, zero test
  files. `scripts/phase3-validation.ts` and `scripts/phase3d-validation.ts` are manual
  `node:assert` scripts with no runner and no CI invocation.
- **No Firestore index configuration** in the repo (`firebase.json` exists; no
  `firestore.indexes.json`). Queries are shaped to avoid composite indexes; a new query shape can
  fail at runtime with index-required.
- **12 dead components.** `SyllableGrid`, `SyllableCell`, `AnnotationInspector`,
  `SelectedSyllableInspector`, `SelectableSyllableText`, `SectionList`, `MetadataPanel`,
  `RawMarkupPreview`, `SongDashboard`, `TechniquePalette`, `VoicePartCueInput` and
  `FloatingTechniqueToolbar` are never imported. The live editing chain is
  `SongEditor → DocumentScriptEditor → LyricLineBlock → VoicePartLanes → NotationInput`.
- **Editor and rehearsal routes sit outside the auth route group.** `/songs/[id]` and
  `/songs/[id]/rehearsal` have no `(workspace)` layout, so an unauthenticated deep link renders a
  loading state instead of redirecting to `/login`.
- **`.gitignore` ignores `.env*`,** which also excludes `.env.example` — the template exists on
  disk but is not tracked.
- **Root `README.md` is untouched create-next-app boilerplate.**
- **Share links are indexable by default** — no `robots` metadata on `/s/{shareId}`; being
  "unlisted" is currently obscurity, not policy.
