# Choirscript — Product Vision

**Purpose:** the long-range product intent, so that near-term work is judged against something
stable. This is a direction document, not a commitment schedule; anything with a date in it lives
in `../planning/implementation-roadmap.md`.

**Status of the product name:** ChoirScript is the working name. A rebrand is planned and
undecided. Nothing in the codebase, the data model, or the public URLs should assume the name is
final, but nothing should be renamed during this planning phase either.

## What the product is today

A browser editor for choir directors who teach by ear. A director keeps songs in a personal
workspace; each song holds lyric sections broken into words and syllables, four vocal parts
(SATB) written in tonic-solfa note names per syllable, technique annotations, director notes, an
optional bar-level timing layer, and an arrangement that sequences the sections. A song can be
rehearsed in a read-only performance view, printed from the browser, or published as a live link
that always shows the current version.

The rehearsal view, not the editor, is what most users touch most often — singers read it on a
phone.

## Where it is going

Three concentric expansions, in dependency order:

1. **A dependable musical core.** Authoring, notation, timing and rehearsal that a director
   trusts for a Sunday service. This is the current focus and does not require any infrastructure
   change.
2. **A public, discoverable library.** Arrangements published to real URLs, indexed by search
   engines, useful to a visitor before they ever create an account. This requires stable
   identity, ownership and server-rendered public pages — which means the infrastructure move.
3. **An operating system for ensembles.** People, services, rehearsals, assignments, development
   tracking — and, later, paid arrangements and produced assets.

## Principles that constrain the work

- **The musical data model is the product.** Rendering, publishing and future AI import are all
  consumers of it. Structured notes and timing stay authoritative; derived notation (barlines,
  dashes, dots, commas) is compiled, never stored as text.
- **The rehearsal view is the product's face.** Singers read it standing up, on a phone, in a
  room with bad light. Density, legibility and part visibility outrank editor features.
- **Useful before signup.** A public arrangement page must let a stranger read, print and
  rehearse without an account. That is the acquisition loop, and it is also the reason publishing
  cannot be an afterthought.
- **Human correction beats automation.** Any AI-generated material arrives as a draft in the
  normal editor, never as an overwrite of a curated arrangement.
- **No premature marketplace.** Ownership, attribution, versions, publication and permissions are
  the primitives; checkout, payouts and listings are deliberately deferred.
- **Not church-only.** The first users are choirs and music ministries, but the model is
  ensembles: bands, worship teams, school choirs, instrumental groups. Product decisions should
  not hardcode Sunday services or four-part-only material.

## What "done" looks like for the current phase

A director can write a song from plain lyrics, split syllables confidently, enter SATB in a way
that does not fight them, lay out timing where it matters, rehearse it on a phone without rotating
the device, print a clean sheet, and share one link that stays current — and none of that breaks
when a section is duplicated, repeated or reordered.

See `features.md` for what of that is already true and `../planning/pre-migration-improvements.md`
for the gaps that block it.
