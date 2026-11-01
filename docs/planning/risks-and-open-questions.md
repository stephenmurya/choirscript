# Planning — Risks and Open Questions

**Purpose:** the things most likely to go wrong, with the cheapest mitigation, plus the questions
that must be answered by the owner before work starts.

## Risks, ordered by expected cost

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | **Identity migration loses access for email/password users** | Medium | Severe | Lazy migration at sign-in + forced set-password link; never attempt to port hashes; 90-day rollback |
| R2 | **OpenNext cannot carry this app** (Next 16 features, edge runtime) | Medium | Severe | Spike before any data work; stop the migration if it fails |
| R3 | **Compiler ships and disagrees with how choirs actually read solfa** | Medium | High | Fixture suite reviewed by two directors before enabling by default; ship behind a flag |
| R4 | **Phone rehearsal regressions** (line fit, tap targets) | Medium | High | Measure at 390 px on every rehearsal change; keep the current rendering as a fallback path for one release |
| R5 | **Rights/takedown exposure on public lyrics** | Medium | High | Rights declaration required for public; instant suspension; clear contact route |
| R6 | **Scope creep into AI/marketplace** before the core is stable | High | High | Phases are gated; Phase 6–8 explicitly deferred |
| R7 | **`SongEditor` resists every change** | High | Medium | Phase 1 reducer extraction before any feature that touches editing |
| R8 | **Share-link abuse** (anonymous POST, 1 MiB payloads) | Medium | Medium | Rate limit + size cap + optional captcha at the edge (works today, pre-migration) |
| R9 | **Duplicate songs fragment search results** | High | Medium | Canonical song identity + merge tooling in Phase 4; curation before scale |
| R10 | **Data loss in the import** | Low | Severe | Idempotent import, staging tables, six validation gates, human sample check, full export |
| R11 | **Cost surprise on Workers/Neon** | Low | Medium | Alerts on invocations, DB compute, R2 egress; page caching by revision |
| R12 | **No tests means silent musical regressions** | High (today) | High | Phase 1 test harness; treat `npm test` as a release gate |

## Open questions

Each has a recommendation so that "unresolved" does not mean "blocked".

### Product

1. **Is "My Part" the phone default, or opt-in?**
   Recommendation: opt-in with a first-run prompt on mobile; singers rehearse different parts.
2. **Should lyric-only rehearsal be a mode or a toggle?**
   Recommendation: a mode in the same control as My Part, because it is a reading intent, not a
   layer.
3. **How many arrangements does a real user keep?** Affects whether the switcher needs search.
   Answer from real workspaces before building anything fancier than a dropdown.
4. **Does print need pagination control (bars per line)?**
   Recommendation: automatic first; add a per-song "bars per system" override only if directors
   ask.

### Data and architecture

5. **SATB notes as `jsonb` per syllable or rows per note?**
   Recommendation: `jsonb` for the migration, with a queryable view; revisit if the diff engine
   needs per-note rows.
6. **One `organisations` table for personal and team, or separate?**
   Recommendation: one table with `kind`.
7. **Where does the compiler live?** Recommendation: a dependency-free package, not `src/lib`.
8. **Live updates after the migration?** Recommendation: poll the revision on the share alias
   only; reintroduce push with collaboration, using a Durable Object.
9. **Do we keep Firebase read access after cutover?** Recommendation: 90 days, then archive.

### Legal and rights

10. **Who verifies a "licensed" declaration?** Recommendation: nobody initially; react to reports.
11. **Can a non-publishable upload be processed privately for stems?** Recommendation: yes, with
    explicit consent and retention limits.
12. **What is the takedown response window?** Recommendation: 72 hours stated, immediate
    suspension on receipt.

### Commercial

13. **Is the free tier unlimited publishing?** Recommendation: yes — the library is the
    acquisition channel; limit AI and storage instead.
14. **Is "Large Band" the tier name?** Recommendation: no; decide with users, keep
    `organisation` in the schema.

## Discrepancies found between planning history and the repository

| Claim in earlier planning | Reality on 2026-11-01 |
| --- | --- |
| Sharing is immutable (ADR-0006) | Superseded by ADR-0011; links are a moving head with a push doorbell |
| Occurrence-level overrides "next phase" | Still not implemented; reserved seam only (C-05) |
| Syllable dictionary is shared across devices | `localStorage` only (D-06) |
| Multiple arrangements shipped with v2 | Model only; no UI (C-04) |
| Section reordering exists | It does not (C-08) |
| Tests exist for timing/arrangement | Zero test files in the repository |
| Public pages exist | Only `/s/{shareId}`, and it is indexable without being intended as public |

Anything older than commit `c91b24a` in planning conversations should be treated as history, not
as state.
