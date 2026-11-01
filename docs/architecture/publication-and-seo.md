# Architecture — Publication and SEO

**Purpose:** the design for public, discoverable arrangement pages, and the acquisition loop they
exist to serve. **Status: NOT STARTED** — the only public surface today is `/s/{shareId}`.

## What exists today

| Surface | Behaviour |
| --- | --- |
| `/s/{shareId}` | Server-rendered page reading a Blob payload; client takes over for live updates |
| Metadata | Title, description, `openGraph`, `twitter` — set per share, no canonical, **no `robots` directive** |
| Indexing | Not excluded: an unlisted link that is discovered can be crawled and indexed |
| URLs | Opaque 10-character ids; no slugs, no canonical song page |
| Structured data | None |
| Sitemap / robots.txt | None |

The missing `robots` directive is a live issue independent of this design: today's links are
labelled "unlisted" in product language but are indexable in fact. Until visibility tiers exist,
`/s/{id}` should emit `robots: { index: false }` unless the owner has opted into indexing.

## Information architecture (proposed)

```text
/songs/{song-slug}                                  canonical song page (aggregates)
/songs/{song-slug}/arrangements/{arrangement-slug}  one arrangement, the rehearsal surface
/creators/{handle}                                  creator profile (later)
/creators/{handle}/{arrangement-slug}               optional short alias → canonical
```

Rules:

- **One canonical URL per arrangement.** `/s/{id}` stays as a *share alias* that redirects
  (301) to the canonical path once publication exists, preserving every link already sent.
- **Slug changes are allowed, ids are not.** A slug change writes a redirect row; `/s/{id}`
  continues to resolve forever.
- **Song page vs arrangement page.** The song page answers "what is this song" (metadata, public
  arrangements, key/tempo range). The arrangement page answers "show me the music". Do not
  duplicate the score across both — the song page links, it does not embed.

## Visibility model

| Visibility | Readable by | Indexable | Notes |
| --- | --- | --- | --- |
| Private | Members of the workspace | No | Default for drafts |
| Unlisted | Anyone with the link | No (`noindex`) | Today's behaviour, made explicit |
| Public | Anyone | Yes | Requires a rights declaration |

Publishing must be a state transition on a *revision*, not a flag on a mutable song: what a
search engine indexed yesterday must remain resolvable. Unpublishing returns 410 or a tombstone
page, never a silent 404 into another song.

## Server rendering and caching

- Public pages must be **server-rendered HTML** containing the lyrics and notation as text, not a
  client-hydrated shell. Search engines and LLM crawlers do not execute the live-swap client.
- Cache with a revision-keyed tag: `publication:{revisionId}`. On publish, revalidate the tag.
  Readers get edge-cached HTML; the owner's editor preview keeps using the live path.
- The client-side live swap (ADR-0011) is an *editor-and-share* convenience. It must not be the
  mechanism that makes the public page correct.

## Structured data

Emit JSON-LD on the arrangement page:

```json
{
  "@context": "https://schema.org",
  "@type": "MusicComposition",
  "name": "Amazing Grace",
  "composer": { "@type": "Person", "name": "John Newton" },
  "inLanguage": "en",
  "musicalKey": "G",
  "hasPart": [{ "@type": "MusicComposition", "name": "Soprano" }]
}
```

For recordings and stems later, `MusicRecording` with `audio` links. Do not promise rich results:
structured data improves eligibility, it does not guarantee anything.

## Crawl policy

```
User-agent: *
Allow: /songs/
Allow: /creators/
Disallow: /api/
Disallow: /settings
Disallow: /songs/*/edit
Sitemap: https://{host}/sitemap.xml
```

Sitemaps should be generated per revision batch, include only `public` arrangements, and carry
`lastmod` from the publication timestamp. An index sitemap is needed once the library passes
~10k URLs.

## The acquisition loop

```text
search ("amazing grace alto part")
   → arrangement page (server-rendered, readable without signup)
      → rehearse on phone / print
         → "duplicate this arrangement" or "create your own"
            → sign up to save
```

Three requirements fall out of it:

1. **Value before signup.** The page must render the full public arrangement, not a teaser.
2. **A reason to stay.** Duplicating an arrangement into the visitor's own workspace is the
   single highest-intent action; it must be one click and must carry attribution.
3. **Measurable.** Publication → view → duplicate → signup needs event tracking from day one, or
   the strategy cannot be evaluated.

## Rights gate

Publishing is blocked unless the owner declares rights for the arrangement: public-domain
composition, licensed, or original. The declaration is stored with the publication and shown on
the page. See `asset-rights-and-storage.md`. This is deliberately a declaration, not a legal
determination — but it is the difference between a library and a liability.

## Dependencies

| Need | Blocks |
| --- | --- |
| Stable identity + sessions server-side | Any owner-only publication action |
| Relational schema with publications + revisions | Canonical URLs, sitemaps, unpublish |
| Rights declaration | Public visibility tier |
| Server-rendered renderer | The entire SEO strategy — the current client-live page cannot serve it |
| Edge caching | Page performance and cost at index scale |

## Risks

1. **Duplicate content.** The same arrangement published twice under different songs will compete
   with itself. Mitigate with canonical URLs and duplicate detection at publish time.
2. **Song metadata is user-supplied and inconsistent.** "Amazing Grace" vs "Amazing grace (Newton)"
   will fragment the library. A song-identity table (canonical title + composer) is needed before
   the library is useful, and it is a curation problem, not only a technical one.
3. **Rights.** The most likely takedown target is lyrics of in-copyright songs. The rights gate and
   a fast unpublish path are cheaper than a legal process.
4. **Client-live rendering is unsuitable for crawlers.** Any attempt to SEO the current `/s/` page
   will underperform; do not try to shortcut the migration.

## Related

- `../architecture/contributions-and-revisions.md` — what "a revision" means when publishing
- `../future/public-library.md` — the library features built on this
- `../product/user-roles.md` — who may publish
