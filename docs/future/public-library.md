# Future Module — Public Library and Discovery

**Purpose:** the browse/search layer on top of published arrangements, and who a creator is.
**Status: NOT STARTED.** Depends entirely on `../architecture/publication-and-seo.md`.

## What it is

The index of everything public: songs, arrangements and creators. It is not a separate product —
it is the public face of the same data the editor produces.

## Song identity (the hardest part)

An organic-search strategy dies if "Amazing Grace" exists as 40 unrelated rows. The library needs a
**canonical song** entity, distinct from any user's arrangement:

```ts
type CanonicalSong = {
  id: string; slug: string;
  title: string; alternativeTitles: string[];
  composer?: string; lyricist?: string;
  firstLine?: string;                 // strong signal for matching
  language: string;
  publicDomain: boolean;
  mergedIntoId?: string;              // canonicalisation without data loss
};
```

Every published arrangement points at a canonical song. Matching at publish time is suggested
(first-line + title + composer), and a human confirms — an automatic merge that is wrong is worse
than a duplicate.

## Browse and search

- `/songs` — alphabetical and by composer, paginated, server-rendered.
- `/songs/{slug}` — canonical page: metadata, public arrangements, keys available, creators.
- Filters that matter to a singer: voicing (SATB/SSA/TTBB/unison), key, difficulty, language,
  has-audio.
- Text search over title/alternative titles/first line. Start with Postgres full-text search;
  do not introduce a search service before there is content to search.
- No infinite scroll for crawlers: real paginated URLs with `rel=next/prev`.

## Creator pages

```text
/creators/{handle}
  ├── bio, links, joined date
  ├── published arrangements (paginated)
  └── (later) paid listings
```

Handles are unique, immutable-ish (redirect on change), and reserved against impersonation.
Attribution on every arrangement links to the creator page.

## Trust and moderation signals

- Verified creator (manual, at first).
- Report count and last-suspended date visible to admins only.
- "Rights declared" badge with the declaration type, never a green "legal" badge.

## Discovery beyond search engines

- Open Graph cards that render the song title and key — WhatsApp is the dominant sharing channel
  among the first users.
- Stable URLs that can be pasted into a group chat and still work in 3 years.
- Optional RSS/Atom per creator (cheap, and useful for the blog/aggregator ecosystem).

## What must exist first

1. Publications with revisions and canonical URLs.
2. Server-rendered pages with crawlable content.
3. Canonical song identity + merge tooling.
4. Rights declarations, suspension and takedown paths.
5. Analytics events: `publication_view`, `duplicate_clicked`, `signup_from_publication`.

## Explicit non-goals for the first version

- Recommendations, feeds, follows.
- Comments or ratings.
- Uploads of audio by the public.
- Any notion of "trending".
