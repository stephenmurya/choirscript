# Future Module — Creator Marketplace

**Purpose:** record the intended shape of paid arrangements and assets so the primitives are not
designed out of the product. **Status: DEFERRED.** Do not build listings, checkout, payouts or
seller onboarding.

## What would be sold

| Product | Notes |
| --- | --- |
| Arrangement (SATB text/score) | The natural extension of publishing; the buyer duplicates into their workspace |
| Original composition | Includes the arrangement rights |
| Stem pack | Derived audio; rights depend on the source recording |
| Backing track | Instrumental render |
| Loop / sample pack | Often the producer's own, sometimes licensed third-party |

Physical goods, instruments, lessons and services are out of scope.

## What the current product must get right (primitives)

```text
Ownership → Attribution → Revisions → Publication → Permissions → Assets → Licence metadata
```

If those seven exist and are queryable, the marketplace is additive. If ownership is implicit (as
it is today) or revisions do not exist, prices cannot be attached to anything meaningful.

## Proposed shape (design only)

- **Listing** = a publication + `{ price, currency, licence, previewPolicy }`.
- **Preview** = the public page's existing rehearsal render, optionally truncated.
- **Entitlement** = a row granting a user the right to duplicate/download a specific revision.
- **Purchase** = payment provider event → entitlement, idempotent by external id.
- **Payout** = a separate settlement process, not part of the product's request path.
- **Licence** = machine-readable, shown before purchase, stored with the entitlement.

## Licensing model (proposal)

Personal-use-by-default is wrong for choirs: a choir director needs an ensemble licence. Offer two
licences per listing — personal/study and ensemble/performance — with clearly different terms.
This is a product decision that affects price, so settle it before building checkout.

## Payments

Use a hosted checkout (Stripe or an equivalent) rather than in-app card handling. Tax and
cross-border complexity is real; a merchant-of-record option is worth its fee for a small team.
Do not build a wallet, credits or refunds UI before there is demand.

## Rights and moderation

- A seller must declare rights for every listing (see
  `../architecture/asset-rights-and-storage.md`).
- Takedown must be able to suspend a listing and revoke entitlements to a specific revision while
  keeping prior purchases readable where legally possible — this is the hardest edge case and is
  the reason not to rush.
- Revenue share terms must be explicit before any money is taken.

## Why deferring is correct

The first users want rehearsal material, not a store. A marketplace built before the library has
traffic has no supply and no demand, and it forces payment, tax and dispute infrastructure into a
product that cannot yet pay for it.
