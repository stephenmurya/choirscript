# Choirscript — Tiers and Monetisation

**Purpose:** the intended commercial shape, so that product decisions leave room for it without
building it now. **Nothing in this document is implemented**, and no pricing is fixed here —
amounts must be re-derived from real provider costs at implementation time.

## Tiers

### Free

The product must be genuinely useful alone, or the public library never forms.

- Song creation, lyrics, sections, arrangement, timing.
- Manual tonic-solfa entry and rehearsal view.
- Print.
- One live share link per song, unlimited viewers.
- Public publishing (unlimited, once it exists).
- Limits: number of songs, number of share links, no AI, no assets.

### Pro

AI-assisted creation and rehearsal, priced against measured processing cost.

- Everything in Free.
- Audio import → draft arrangement (lyrics, sections, timing, tentative parts) via
  `../future/ai-processing.md`.
- Stem separation and practice tracks (mute/solo per part).
- Processing credits or minutes, with an allowance that resets monthly.
- Unpublished drafts and private arrangements.

### Organization ("Large Band" is a provisional name)

- Everything in Pro, plus people, services, repertoire planning, attendance, development.
- Shared processing allowances pooled across members.
- Role-based permissions and an org-level billing contact.
- See `../future/band-management.md`.

Naming: "Organisation" reads corporate; "Team" is ambiguous between a band and a workspace;
"Ensemble" is accurate but unfamiliar to most church music directors. Decide with real users;
the data model should call it an *organisation* regardless of the marketing label.

## Cost structure to respect

The only hard constraint: AI processing costs money per minute whether or not the user
succeeds. Pricing must therefore be metered, not "unlimited AI".

| Cost | Driver | Notes |
| --- | --- | --- |
| Audio processing | Provider per-minute rate × pipeline stages × retries | SATB separation may run 2–3 models; see `../future/ai-processing.md` |
| Storage | Original uploads, separated stems, derived audio | Stems are several times the size of the source |
| Egress | Rehearsal playback of stems | R2 has no egress fee, which is the main reason it is the target |
| Compute | SSR of public pages | Must be cacheable at the edge or SEO economics invert |
| Support | Human time per organisation | Dominant at low volume |

## Metering primitives (design now, build later)

- Every processing job is a row with `provider`, `input_seconds`, `cost_estimate`, `status`.
- Credits are consumed on **successful completion**, not on submission.
- Failed jobs are refunded automatically, and the retry is counted separately.
- Allowances belong to the organisation, not the seat, when the tier is Organization.

## What must exist before charging anyone

1. Stable identity and ownership (otherwise billing cannot be tied to content).
2. A metering table with idempotent job records (otherwise double-charging on retries).
3. An entitlement check on the server, not in the client bundle.
4. A cancellation path that keeps authored content readable — a lapsed subscription downgrades
   to Free; it must not hide a director's songs.

## Deliberately deferred

- Payments, invoicing, tax handling, dunning.
- Marketplace transactions and revenue share (`../future/marketplace.md`).
- Per-seat pricing beyond the organisation tier.
- Any pricing page or upsell UI in the current product.
