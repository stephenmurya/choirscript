# Planning — Pre-Migration Improvements

**Purpose:** the work worth doing **before** the infrastructure move, ranked. Everything here is
either backend-independent or cheap enough to survive the move unchanged. No item is approved
until the owner picks it; this is a menu with reasoning, not a mandate.

Filter applied: anything that will be rewritten by the migration is excluded, and anything that
is already DONE is excluded (see `../product/features.md`).

## Tier 1 — Do first (small, high value, zero migration risk)

| # | Work | Why now | Size | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | **Sections can be reordered** (C-08) | Users recreate sections to move them; the model already has ids and order | S | Drag or up/down on section header; occurrences referencing the section follow the content, not the position; undoable |
| 2 | **Arrangement switcher** (C-04) | The array and `activeArrangementId` already exist; the UI denies it | M | Create / rename / duplicate / delete / switch; each arrangement keeps its own occurrences; rehearsal renders the active one |
| 3 | **Honest live badge** (H-07) | A frozen link says "Live" today | XS | Shared page checks `/rev`; frozen links render `Snapshot from <date>` with no live affordance |
| 4 | **`robots: noindex` on `/s/{id}`** (H-13) | Unlisted links are currently indexable | XS | `Metadata.robots` set; verified with a crawled response |
| 5 | **Performer suggestions off localStorage** (G-06) | Suggestions vanish per device | S | Stored on the song or workspace; merged on load |
| 6 | **Save/publish failure is visible** (J-10) | A failed publish is only a console line | S | Non-blocking banner with retry; publish state visible in the header |

## Tier 2 — The musical core (larger, still pre-migration)

| # | Work | Why now | Size | Acceptance |
| --- | --- | --- | --- | --- |
| 7 | **Extract domain package** | Everything below depends on testable domain code | M | `arrangement`, `timing`, `notation`, `syllableSplitter`, `annotationUtils`, `lineText` move with no behaviour change; `tsc` clean |
| 8 | **Test harness + first suites** (J-07) | Zero tests means every change is a guess | M | Vitest (or node:test) wired to `npm test`; suites for syllable splitting, timing arithmetic, arrangement resolution, duplication/id remapping |
| 9 | **Pitch model: octave + accidental** (E-07) | Blocks notation and any real SATB work | L | `Pitch` type in the model; migration maps existing note names; editor accepts octave/accidental input; old documents load unchanged |
| 10 | **Melisma** (E-08) | Held vowels with moving parts are the norm in real arrangements | L | Several notes per part per syllable; rehearsal renders them; timing units stay consistent; print/notation aware |
| 11 | **Notation compiler: `SolfaScore`** (F-11, G-09) | The product promise for rehearsal; removes typed punctuation | XL | Pure `compile()` with the fixture set in `../architecture/tonic-solfa-engine.md`; rehearsal can render either the compiler output or the current chips behind a flag |
| 12 | **Compound meter grouping** (F-08) | 6/8 currently behaves like 6/4 | M | Group/pulse model; beat labels follow groups; compiler uses it |
| 13 | **Section reorder + repeat integrity** (F-10) | Editing bars after occurrences exist can desync | M | `validateSong` reports orphaned events and bars; repair on demand, not silently |

## Tier 3 — Rehearsal and print (high user value, medium risk)

| # | Work | Why now | Size | Acceptance |
| --- | --- | --- | --- | --- |
| 14 | **"My Part" mode** (G-10) | The most requested rehearsal behaviour for singers | M | One part at large type, columns preserved, remembered per user |
| 15 | **Lyrics-only mode** (G-11) | Cheap, useful for memorisation | S | Toggles notes off without changing layout |
| 16 | **Phone line fit** (G-08b) | Users still rotate the device for long lines | M | Long lines wrap at syllable boundaries without breaking alignment; measured on 390 px with a 16-syllable line |
| 17 | **Print sheet** (G-13) | Print is the fallback for the whole platform | L | Systems with aligned SATB rows, repeating header, page breaks, no clipped lanes; validated by printing a 4-section song to PDF |
| 18 | **Saved view presets** (G-12) | Toggles reset every reload | S | Persisted per user; defaults per device class |

## Tier 4 — Editor ergonomics (valuable, but decide after Tier 1–2)

| # | Work | Note |
| --- | --- | --- |
| 19 | **`SongEditor` → reducer + hooks** | Prerequisite for durable undo and for revisions; no user-visible change |
| 20 | **Durable undo** (J-02) | Per arrangement, survives reload; depends on 19 |
| 21 | **Faster publish** | 2 s publish debounce → 600 ms, or publish straight off the save; measured 428 ms transport, so the debounce is the lever |
| 22 | **Word/syllable affordance rework** | One affordance, not two; larger touch targets |
| 23 | **Keyboard-first SATB entry** | Tab/arrow navigation across syllables and parts, "copy down" a part |
| 24 | **Accessibility pass** (J-13) | Labels on icon buttons, focus order, contrast of technique colours |
| 25 | **Syllable dictionary to the account** (D-06) | Prefer to do this *after* the migration, unless the merge logic is trivial |

## Explicitly NOT before the migration

- Public pages and SEO (needs SSR + slugs + revisions).
- Ownership/permissions UI beyond the current owner.
- Proposals/revisions.
- Any AI feature.
- Marketplace, tiers, payments.
- Rebrand.

## Sequencing rationale

Items 1–6 are a single afternoon each and remove known irritations. Items 7–8 are prerequisites
for 9–13: writing a compiler or a pitch model without tests will produce the kind of regression
that makes directors distrust the tool permanently. Item 11 (the compiler) is the single largest
piece of product value available before the migration, and it subsumes the "typed punctuation"
complaint entirely.

Do not start 9–11 before 7–8 are done. Do not start 14–17 before 11 unless the compiler is
deferred, in which case print and My Part become the highest-value items on their own.
