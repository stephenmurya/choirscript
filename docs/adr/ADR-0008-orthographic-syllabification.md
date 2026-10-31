# ADR-0008: Orthographic hyphenation with curated exceptions and manual override

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`. Manual split editing has existed
since Phase 2; the precedence chain is from the working tree on 2026-10-31.

## Context

ChoirScript places one notation cue per sung syllable. Splitting a word into sung syllables is
phonetic and language-dependent: "every" is two sung syllables, "enough" is two, "hallelujah"
is four. Shipping a phonetic syllabifier for English (or any language) is a research-grade
problem, and the app cannot assume English lyrics.

At the same time, an editor that splits words badly is unusable, because every cue, technique,
and timing event is attached to a syllable token.

## Decision

Use a three-level precedence chain in `splitWordIntoSyllables`
(`src/lib/syllableSplitter.ts:101`):

1. **User dictionary** (highest): `lookupSyllables` from `src/lib/syllableDictionary.ts`
   (uncommitted). Keys are lowercased and trimmed (`normalizeWordKey`, `:63`); entries are
   applied with the word's own leading/trailing punctuation and capitalization carried across
   the pieces (`applyPieces`, `:67`).
2. **Curated exceptions**: a hand-written map of choir vocabulary where the pattern dictionary
   is wrong or conservative (`EXCEPTIONS`, `:30`), for example `resurrection` ->
   `res,ur,rec,tion` and `hallelujah` -> `hal,le,lu,jah`.
3. **`hyphen` en-US patterns** (lowest): `createHyphenator(patterns, { sync: true })` (`:7`,
   `:89`).

The editor also offers explicit manual control per word: a hyphen-separated text field, merge,
split-at-index, and restore-automatic (`src/components/LyricLineBlock.tsx` word-edit form;
handler at `src/components/SongEditor.tsx:625`). `splitManualSyllables` treats hyphen, en dash,
em dash, slash, middot and bullet as break characters (`:142`).

Tokenization accepts any Unicode letters/digits plus apostrophes, with leading and trailing
punctuation captured separately (`WORD_PATTERN`, `:20`). This is an uncommitted change from an
ASCII-only pattern; before it, accented and non-Latin words came back as one unsplit token.

## Consequences

Positive:

- No server dependency and no language detection; splitting is deterministic and offline.
- Common worship vocabulary is correct because of the exception list.
- A human can always fix a split, and the fix can be remembered per word (dictionary).
- Non-Latin scripts no longer collapse into one token; where patterns do not apply, the manual
  editor is the fallback.

Negative and accepted:

- Orthographic hyphenation is not phonetic. `enough` does not split, `everything` yields two
  pieces where a singer needs four, and `-tion` boundaries may differ from sung boundaries. The
  code comment acknowledges this (`:98`-`:99`).
- `hyphen` ships en-US patterns only; other languages get little or no benefit from level 3.
- The user dictionary is browser-local and per-device (`localStorage`, key
  `choirscript.syllableDictionary.v1`), so a split learned on one machine is absent on another.
  This is explicitly a temporary seam (`src/lib/syllableDictionary.ts:1`-`:13`).
- Manual splits are preserved through `WordToken.syllabification = "manual"`, but a lyric edit
  can still replace a word with a differently spelled token and lose the association; the
  reconciliation is LCS-based (`src/lib/lineText.ts:85`).

## Alternatives rejected

- **A phonetic dictionary / pronunciation service.** Adds a dependency, latency, licensing, and
  a failure mode for a feature that must work offline in a rehearsal room.
- **Heuristic vowel-group splitting.** Cheap but wrong often enough to be worse than hyphenation,
  and it breaks on non-English text.
- **Asking the user for every word.** Unacceptable friction; the dictionary + exceptions cover
  the common case and manual editing covers the rest.

## Evidence

- `src/lib/syllableSplitter.ts:1`-`:125`, `:142`-`:151`
- `src/lib/syllableDictionary.ts:1`-`:135`
- `src/components/SongEditor.tsx:625`-`:686`
- `src/components/LyricLineBlock.tsx` (word-edit form)
- `scripts/phase3d-validation.ts:8`-`:40` (manual corpus assertions, including punctuation and
  apostrophe cases)
