# Rendering and print

Two families of renderer exist: the **editor grid** (mutable, one canonical section order) and
the **rehearsal renderer** (read-only, arrangement order, print-aware). They share the same
tokens and the same technique helpers, but they are separate components.

## Editor grid

`LyricLineBlock` renders one lyric line as a CSS grid (`src/components/LyricLineBlock.tsx`,
`line-grid-shell`):

```
column 1            columns 2..N+1
[ sticky label ]    [ syllable ] [ syllable ] [ syllable ] ...
row 1..k            technique range badges, spanning their syllable ranges
row lyricGridRow    lyric syllable buttons, "-" suffix on non-final syllables of a word
row voiceStartRow.. one row per enabled part (VoicePartLanes -> NotationInput per syllable)
```

Column width is driven by CSS variables: `--line-label-col` and `--syllable-col-min`
(`src/app/globals.css:108`, overridden for print at `:176`). The grid template is built from
the number of syllables with a minimum of one column (`src/components/ColorfulRehearsalView.tsx:151`
shows the same construction used by the rehearsal renderer).

Technique ranges are not one badge per syllable. `groupTechniqueRanges` converts annotations
into contiguous ranges over the line's flattened syllables
(`src/lib/annotationUtils.ts:116`), `groupTechniqueDisplayRanges` merges/extends them for
display (`:168`), and `arrangeTechniqueRangeRows` assigns each range to a non-overlapping row
(`:251`). Ranges are positioned with `gridColumn: start+2 / span length`.

Syllable selection is pointer-driven, not native text selection: `onPointerDown` starts a drag,
`onPointerEnter` extends it, `onPointerUp` emits the range plus a menu position for the
technique context menu (`src/components/LyricLineBlock.tsx`, `emitSelection`). `Escape` clears
the selection (`src/components/DocumentScriptEditor.tsx:208`). Double-clicking a syllable opens
the word-level split editor.

The word split editor is an inline panel, not a modal. Double-clicking any syllable token, or
clicking the hover affordance shown on the final syllable of a word with at least three letters,
opens it (`src/components/LyricLineBlock.tsx`; `MIN_SPLIT_AFFORDANCE_LETTERS` in
`src/lib/syllableSplitter.ts:13`). The panel offers a hyphen-separated text field with a live
preview, "Merge syllables", "Split at" a character index, "Restore automatic", "Forget saved
split", and an "apply to every occurrence" switch.

Applying a split marks the word `manual`, maps the new texts onto existing syllable objects by
index (preserving syllable IDs, and therefore part cues and timing references), creates new
syllables for extra pieces, and prunes annotations that referenced removed syllables. The edit
runs through `applyWordSyllables` in `src/lib/lineText.ts`, which supports both the single-word
case and the whole-song case (every occurrence of the same word is split at once when the
"apply everywhere" switch is on). Saved splits are remembered per device in
`src/lib/syllableDictionary.ts` (localStorage) until the backend migration lands.

## Rehearsal renderers

`RehearsalView` chooses the renderer from `song.mode` (`src/components/RehearsalView.tsx:177`):

| `song.mode` | Renderer | Visual model |
| --- | --- | --- |
| `simple` | `ColorfulRehearsalView` | Lyrics row + one row per voice with colored part labels, technique badges above the lyrics |
| `advanced` | `AdvancedTimingRehearsalView` | Bar row, count row, timing-event row, lyrics row, then one row per part, all on a beat-unit grid |

The public share page makes the same choice (`src/app/s/[shareId]/page.tsx:143`).

### Arrangement resolution

Both renderers iterate `resolveArrangement(song)` (`src/lib/arrangement.ts:52`):

1. Look up the active arrangement, falling back to the first arrangement, then to Source order
   when no arrangement exists or it has no occurrences (`:56`, `:68`).
2. For each occurrence, resolve `sourceSectionId`; unresolvable occurrences are dropped (`:73`).
3. Expand `repeatCount` into `repeatIndex` rows 0..n-1 (`:79`).
4. Emit `{ occurrenceId, occurrence, section, repeatIndex, renderIdentity }` where
   `renderIdentity = occurrence.id + ":" + repeatIndex` (`:84`).

The fallback path synthesizes occurrence ids of the form `fallback:{sectionId}` (`:58`), so even
a malformed song renders.

### Render identity and DOM ids

- Section wrapper: `key={renderIdentity}`, `id={"rehearsal-" + renderIdentity}`
  (`src/components/ColorfulRehearsalView.tsx:273`-`:277`, `src/components/AdvancedTimingRehearsalView.tsx:297`-`:302`).
- Line: `key={renderIdentity + ":" + line.id}`, and the line component receives
  `renderIdentity` built from `occurrenceId:repeatIndex:lineId`
  (`src/components/ColorfulRehearsalView.tsx:288`).
- Syllable and event placements use composite keys (`${renderIdentity}:${flat.id}`,
  `${occurrenceId}:${event.id}`).

This matters because the same `section.id` can appear several times in one page. A bare
`section.id` key or DOM id would collide.

### Arrangement rail and scroll-spy

`ArrangementRoadmap` lists the resolved rows in performance order, labels repeats as
`"<name> · repeat N"`, and scrolls to `rehearsal-<renderIdentity>` on click
(`src/components/ArrangementRoadmap.tsx`). The heading reads **Arrangement** (it was "Roadmap"
until 2026-10-31). On phones `ArrangementMobileBar` renders the same trigger above the song
title, so the rail is not a long scroll away; the desktop aside is pinned flush to the right edge
of the viewport (`lg:grid-cols-[minmax(0,1fr)_17rem]`, no centering container).

The active-row highlight is an `IntersectionObserver` created in a `useEffect`.

```ts
{ rootMargin: "-80px 0px -65% 0px", threshold: [0, 0.1, 0.5] }
```

`rootMargin` accepts only pixels and percentages. The previous value used `-5rem`, which made
the `IntersectionObserver` constructor throw a `SyntaxError` inside the effect. The throw
escaped the effect and unmounted the rehearsal tree, which surfaced as Next's "This page
couldn't load" error boundary for both `/songs/[id]/rehearsal` and `/s/[shareId]`. Commit
`a79c7b1` replaced `rem` with `px` and wrapped construction in `try/catch` so a future
regression degrades to "no scroll-spy" rather than a blank error page
(`src/components/ArrangementRoadmap.tsx:20`-`:33`).

### Display toggles

`RehearsalDisplayToggles` (`src/components/ColorfulRehearsalView.tsx:18`) carries one boolean per
part plus `techniques`, `directorNotes`, `largeText`, `blackAndWhite`, and `enabledParts`.
Rendering a part row requires both `enabledParts.includes(part)` and the part's own toggle
(`src/components/ColorfulRehearsalView.tsx:58`, `src/components/AdvancedTimingRehearsalView.tsx:126`).

Initial toggles are data-derived: `RehearsalView` turns a part on only when
`songHasPartEntries` finds a non-empty cue for it, and applies `getEnabledVoiceParts` for the
available set (`src/components/RehearsalView.tsx:75`-`:83`, `src/lib/songSelection.ts:67`).
The display panel only lists part switches that are enabled for the song (`:155`).

`largeText` adds the `.large-text` class (`font-size: 1.12rem`, `src/app/globals.css:69`);
`blackAndWhite` adds `.print-black-white`, which is only meaningful inside the print media
query but is also present on screen.

## Print pipeline

Print is browser-native. There is no server-side PDF renderer and no PDF library in
`package.json`.

```
PrintToolbar "Preview & Print"  ->  window.print()   (src/components/PrintToolbar.tsx:17)
SharedPageActions "Print / Save PDF" -> window.print()   (src/components/SharedPageActions.tsx)
```

The toolbar shows an informational toast before printing when color is on: "For color
printouts, enable Background graphics in the browser print dialog"
(`src/components/PrintToolbar.tsx:20`). The comment above it records that a server-side PDF
service was considered and deferred (`:18`).

Print CSS lives in one block, `src/app/globals.css:132`-`:205`:

| Rule | Effect |
| --- | --- |
| `@page { margin: 0.55in }` | Page margins |
| `html, body` forced white/near-black | Avoids printing the dark theme |
| `.no-print`, popover/dialog/sheet/dropdown content, `nav`, `button`, `input`, `textarea`, `select` hidden | Removes all chrome, controls, and the roadmap |
| `.rehearsal-document` max-width none, padding 0 | Fills the page |
| `.line-scroll` overflow visible, scrollbar hidden | A horizontally scrolled line prints in full instead of clipped |
| `.line-grid-shell` width fit-content, min-width 0 | Grid shrinks to content |
| `.line-block` smaller label and syllable columns (`2rem`, `1.9rem`, timing unit `2rem`) | Fits more syllables per page |
| `print-color-adjust: exact` on the document and descendants | Keeps technique colors |
| `.rehearsal-line`, `.rehearsal-section`, `.line-block`, `.line-scroll`, `.line-grid-shell`, legends get `break-inside: avoid` (`:114`) | Keeps a line/section from splitting across pages where the browser honors it |
| `.print-black-white` forces white background, black border and text, no shadow | Monochrome print variant |

Because the whole rehearsal body is inside `<article class="rehearsal-document">`, the print
sheet is the document plus nothing else. On the shared page the header carries `no-print`
(`src/app/s/[shareId]/page.tsx:115`), so shared links print the same content as the in-app
rehearsal view.

Verified limitations:

- Page breaks are advisory (`break-inside: avoid`); a section taller than a page still splits.
- No page numbers, running headers, or per-page repeat of the song title.
- No pagination controls, paper size selection, or scale factor beyond the browser dialog.
- Color fidelity depends on the browser's "Background graphics" setting, which the app can
  only remind the user about.
- The black-and-white toggle is a print-time visual class; it does not change the on-screen
  colors except by applying the same forced palette.

## Drift from the Phase 3A document

Section J of `docs/phase-3-source-arrangement-architecture.md` states:

> "none of the current components emit DOM `id` attributes from data IDs (verified); the
> no-collision requirement is therefore satisfied by React keys alone."

That is no longer true. Both rehearsal renderers emit
`id={"rehearsal-" + renderIdentity}` and `arrangement-roadmap` relies on those ids for
`getElementById` scroll targets (`src/components/ArrangementRoadmap.tsx:16`). The rule the
document wanted — any DOM id must include the occurrence identity — is satisfied, because
`renderIdentity` starts with `occurrence.id`. Section J's resolver sketch is also out of date:
the shipped resolver expands `repeatCount` and returns `repeatIndex` and `renderIdentity`
(`src/lib/arrangement.ts:15`, `:79`).

## Related

- Aggregate and timing model: [data-model.md](data-model.md)
- Route and toggle state: [routing-and-state.md](routing-and-state.md)
- Print decision record: [ADR-0009](../adr/ADR-0009-browser-print.md)
