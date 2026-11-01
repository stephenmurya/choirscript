# Planning — Decision Log

**Purpose:** the index of decisions, their status, and where the reasoning lives. ADRs hold the
detail; this table is the map. When a decision changes, add a row and mark the old one superseded —
never quietly edit history.

Status vocabulary: **Accepted** (in force), **Proposed** (recommended, awaiting the owner),
**Superseded**, **Rejected**, **Deferred**.

## Architecture decisions (ADRs)

| ID | Decision | Status | Detail |
| --- | --- | --- | --- |
| ADR-0001 | Auth gating is client-side; security is enforced by Firestore rules | Accepted | `../adr/ADR-0001-client-side-auth-gating.md` |
| ADR-0002 | Firestore is the system of record | Accepted | `../adr/ADR-0002-firestore-system-of-record.md` |
| ADR-0003 | Song documents split into body + summary card | Accepted | `../adr/ADR-0003-split-song-documents.md` |
| ADR-0004 | Source/Arrangement model: canonical sections, occurrences reference them | Accepted | `../adr/ADR-0004-source-arrangement-model.md` |
| ADR-0005 | A single normalisation boundary for song documents | Accepted | `../adr/ADR-0005-single-normalize-boundary.md` |
| ADR-0006 | Share links are immutable Blob snapshots | **Superseded** by ADR-0011 | `../adr/ADR-0006-immutable-blob-shares.md` |
| ADR-0007 | Timing is shared by default with per-part overrides | Accepted | `../adr/ADR-0007-part-scoped-timing.md` |
| ADR-0008 | Orthographic syllabification: dictionary → exceptions → hyphenation | Accepted | `../adr/ADR-0008-orthographic-syllabification.md` |
| ADR-0009 | Print via the browser, not a server PDF pipeline | Accepted | `../adr/ADR-0009-browser-print.md` |
| ADR-0010 | Deterministic default workspace id `default-{uid}` | Accepted | `../adr/ADR-0010-deterministic-workspace-ids.md` |
| ADR-0011 | Live share links: moving head, revision counter, push doorbell | Accepted | `../adr/ADR-0011-live-share-links.md` |

## Product and delivery decisions

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-01 | Share links follow the song; viewers see edits in seconds | Accepted (shipped) | Users were re-sharing links after every edit |
| D-02 | Delivery is a push doorbell, not a poll | Accepted (shipped) | Polling costs per viewer per minute; the doorbell is idle-free |
| D-03 | The "Publish now" button stays as a **manual retry** | Accepted | The owner prefers a visible retry to a silent auto-publish |
| D-04 | Print stays browser print; no PDF service | Accepted (ADR-0009 reaffirmed) | Cheaper and adequate; the compiler improves output, not delivery |
| D-05 | Mobile density is achieved by shrinking note cells, not type | Accepted (shipped) | Type size is a legibility floor; cells set column width |
| D-06 | Part lanes render from content, not the voice preset | Accepted (shipped) | A part with notes must never be invisible |
| D-07 | Frozen pre-ADR-0011 links stay frozen; users re-share once | Accepted | No token exists for them; retro-fitting one would be guesswork |

## Documentation decisions

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-08 | Documentation lives under `/docs`, not `/project_meta` | Accepted | One tree, already versioned; avoids two competing archives |
| D-09 | Every change updates the ledger, an ADR when a decision changes, and the matching architecture doc — in the same commit | Accepted | The docs rot within days otherwise |
| D-10 | Status vocabulary is DONE / INCOMPLETE / NOT STARTED / DEFERRED / SUPERSEDED, applied identically everywhere | Accepted | Removes "mostly done" ambiguity |
| D-11 | The implementation ledger is `docs/ledger/implementation-ledger.md`; planning does not keep a second copy | Accepted | A duplicated ledger becomes two wrong ledgers |

## Target architecture

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-12 | Move off Vercel + Firestore to Cloudflare Workers (OpenNext) + Neon Postgres (Drizzle) | **Accepted as direction**, not implemented | Relational needs (publishing, revisions, metering) and egress costs |
| D-13 | Better Auth replaces Firebase Auth; identities migrate lazily at sign-in | **Accepted as direction** | Sessions live with content; no vendor lock; hashes cannot be ported |
| D-14 | Cloudflare R2 replaces Vercel Blob; no public buckets | **Accepted as direction** | Zero egress is decisive for audio |
| D-15 | Publishing points at an immutable revision; the song itself stays mutable | **Accepted as direction** | What search indexed must remain resolvable |
| D-16 | Public pages are server-rendered and cached by revision; the client live-swap is not the SEO mechanism | **Accepted as direction** | Crawlers do not execute the live client |
| D-17 | After the move, live updates on the share alias degrade to polling; push returns only with collaboration | Proposed | A Durable Object per publication is unnecessary until real-time editing exists |
| D-18 | Murya talks to Choirscript through authenticated internal APIs, never the database | Accepted as direction | Keeps the product's schema independent |

## Musical engine

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-19 | Traditional tonic-solfa notation becomes the primary rehearsal presentation, compiled from note + timing data | Proposed | Users should not type punctuation the system can derive |
| D-20 | The compiler is a pure `Song → SolfaScore → renderer` pipeline with its own fixture tests | Proposed | Testability and reuse by print, review UI and public pages |
| D-21 | Pitch gains an explicit octave and accidental dimension | Proposed | The current eight names cannot express what choirs sing |
| D-22 | Melisma (multiple notes per syllable per part) is part of the model | Proposed | Held vowels with moving parts are normal repertoire |
| D-23 | Editors keep the visual grid; the compiler never replaces precise authoring | Proposed | The grid is good at entry; the score is good at reading |

## Scope decisions

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-24 | AI processing is deferred until after the infrastructure move | Accepted as direction | Needs queues, R2 and metering to be economic |
| D-25 | Where AI runs, the user-supplied per-part recordings route ships first | Proposed | Deterministic quality; separation is unproven |
| D-26 | The marketplace is deferred; only its primitives are built (ownership, attribution, revisions, publication, permissions, assets, licensing) | Accepted | No supply, no demand, and it drags in payments and disputes |
| D-27 | Band/organisation management is deferred until editor and publishing are stable | Accepted | The editor is the product people use weekly |
| D-28 | Public publishing requires a rights declaration | Proposed | The cheapest credible defence against takedown exposure |

## Rejected alternatives (kept so they are not re-proposed)

| Idea | Why rejected |
| --- | --- |
| Polling `/rev` every 3 s from every viewer | Cost scales with viewers × time; replaced by the doorbell |
| SSE or WebSockets on Vercel functions | Billed while held, `maxDuration` forces reconnects, no WebSocket support |
| Server-side PDF generation now | Extra infrastructure for a job the browser already does adequately |
| Porting password hashes from Firebase | Not possible; forces a reset flow instead |
| Storing notation as a string | The structured model is the product; strings cannot be compiled, diffed or queried |
| A client-side rich text editor for lyrics | The syllable model is the source of truth; markup as the primary format inverts it |
