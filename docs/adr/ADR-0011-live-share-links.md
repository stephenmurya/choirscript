# ADR-0011 — Live share links (supersedes ADR-0006)

**Status:** Accepted
**Supersedes:** ADR-0006 (Immutable Blob shares)

## Context

ADR-0006 stored each shared song as a write-once Blob. The guarantee was simple:
a link never changes. In practice a director fixes a wrong note or a misspelled
line, then has to mint a new link and resend it to the whole choir — every
singer who kept the old message silently rehearses stale parts. The freeze also
made "why are my new parts missing?" indistinguishable from a bug.

Printing is not the reason the feature exists. Print is an export: a sheet once
printed keeps what it has, exactly like a document printed anywhere else. The
link is the product surface, and it should follow the song.

## Decision

A share is a **moving head**:

- `shares/<id>.json` is written with `allowOverwrite: true` and republished by
  the editor whenever the song changes (2 s trailing debounce, so a burst of
  typing publishes once).
- `shares/<id>.rev.json` is a tiny head (`{ revision, updatedAt }`) that open
  rehearsal pages poll every 3 s — a few dozen bytes instead of the whole song.
- `shares/<id>.key.json` holds the share's `editToken`. Publishing requires the
  token; the token is stored on the owner's song document (Firestore), never in
  the public payload.
- Readers fetch with `useCache: false` and the routes answer `no-store`; a cached
  copy would serve the previous revision for the length of the CDN TTL.
- `/s/<id>` is a server component that renders `SharedSongLive`, a client
  component holding the payload. When the polled revision moves it fetches the
  payload and swaps it in place — no reload, no lost scroll position.

`revision` is a monotonically increasing integer. Payloads written before this
ADR have none and read as revision 1.

## Consequences

- The same link always shows the current song; directors stop resending links.
- ADR-0006's immutability guarantee is gone: a viewer's page can change while
  they are looking at it. Mitigated by publishing only on save, showing a live
  "Updated …" stamp, and never re-rendering on a stale poll.
- A pinned/archived revision would need `shares/<id>/rev-<n>.json` retention;
  not implemented, deliberately, until someone needs it.
- Share creation and republishing remain unauthenticated (the link is the
  credential) — the `editToken` is what separates "can view" from "can write".
