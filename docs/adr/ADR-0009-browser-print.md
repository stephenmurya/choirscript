# ADR-0009: Print through the browser, styled with print CSS

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

Directors print rehearsal sheets, and "Save as PDF" is the same browser dialog. The content is a
CSS grid whose columns align lyrics with voice rows and technique ranges, so any renderer must
reproduce the grid faithfully.

Options: browser print, a client-side PDF library, a headless-browser service, or a server-side
PDF generator with a second layout implementation.

## Decision

Use `window.print()` for both the in-app rehearsal view and the public share page, and make the
existing DOM print correctly through one `@media print` block.

- `PrintToolbar` exposes "Preview & Print" / "Print black and white" and calls `window.print()`
  (`src/components/PrintToolbar.tsx:17`-`:22`).
- `SharedPageActions` exposes "Print / Save PDF" calling `window.print()`
  (`src/components/SharedPageActions.tsx`).
- Print rules hide `.no-print`, navigation, buttons, inputs, textareas, selects, and all
  popover/dialog/sheet/dropdown content; force a light palette; remove max-width and padding from
  the document; let horizontally scrolled lines print in full; shrink grid columns; preserve
  technique colors with `print-color-adjust: exact`; and avoid breaking lines/sections across
  pages (`src/app/globals.css:132`-`:205`, `:114`-`:124`).
- A black-and-white mode toggles `.print-black-white`, which forces white background, black
  borders and black text (`src/app/globals.css:198`).

The code comment in `PrintToolbar` records the alternative that was deferred: server-side PDF
rendering via a dedicated service (`:18`-`:19`).

## Consequences

Positive:

- The printed layout is the rendered layout; there is no second layout implementation to keep in
  sync as the grid evolves.
- Zero server cost, zero PDF library in the bundle, works offline once the page is loaded.
- Share pages print without authentication, because printing is a browser capability.

Negative and accepted:

- No control over pagination beyond `break-inside: avoid`; a section taller than a page splits.
- Color output depends on the browser print setting ("Background graphics"), which the app can
  only mention in a toast (`src/components/PrintToolbar.tsx:20`).
- No page numbers, headers/footers, paper size control, or scaling.
- No automated verification of print output; it is CSS that has never been snapshot-tested in
  this repository.
- A future automated PDF pipeline will need a headless browser to reuse this CSS, not a
  reimplementation.

## Alternatives rejected

- **`jsPDF`/`pdf-lib` in the browser.** Would require re-implementing the grid and technique
  ranges in PDF primitives; high effort, high drift risk.
- **Server-side headless Chrome.** Real infrastructure cost and a new deployment surface for a
  feature the browser already provides.
- **A print-only HTML view.** A second renderer to maintain, with the same drift risk.

## Evidence

- `src/components/PrintToolbar.tsx`
- `src/components/SharedPageActions.tsx`
- `src/app/globals.css:114`-`:124`, `:132`-`:205`
- `src/components/RehearsalView.tsx:150` (toolbar mount)
- `src/app/s/[shareId]/page.tsx:115` (header marked `no-print`)
