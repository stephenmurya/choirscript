import createHyphenator from "hyphen";
import patterns from "hyphen/patterns/en-us";
import { lookupSyllables } from "./syllableDictionary";

type Hyphenator = (word: string, options?: { hyphenChar?: string }) => string;

const hyphenateEnglish = createHyphenator(patterns, { sync: true }) as Hyphenator;

/**
 * Minimum letter count before a word offers the manual split affordance.
 * Short words ("a", "to", "the") have nothing useful to split.
 */
export const MIN_SPLIT_AFFORDANCE_LETTERS = 3;

/**
 * Word core is any run of Unicode letters/digits plus apostrophes. The old
 * ASCII-only pattern returned non-Latin and accented words as one unsplit
 * token, which is why non-English lyrics never broke apart.
 */
const WORD_PATTERN = /^([^\p{L}\p{N}]*)([\p{L}\p{N}'’]+)([^\p{L}\p{N}]*)$/u;
const EDGE_NON_WORD = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const LEADING_EDGE = /^[^\p{L}\p{N}]+/u;
const TRAILING_EDGE = /[^\p{L}\p{N}]+$/u;

/**
 * Hand-hyphenated exceptions for choir vocabulary where English orthographic
 * patterns are too conservative or choose a different acceptable boundary.
 * Manual correction (and the user dictionary) remains the final authority.
 */
const EXCEPTIONS: Record<string, string[]> = {
  overcame: ["o", "ver", "came"],
  amazing: ["a", "maz", "ing"],
  presence: ["pres", "ence"],
  nothing: ["noth", "ing"],
  future: ["fu", "ture"],
  treasure: ["trea", "sure"],
  matchless: ["match", "less"],
  resurrection: ["res", "ur", "rec", "tion"],
  hallelujah: ["hal", "le", "lu", "jah"],
  forever: ["for", "ev", "er"],
  savior: ["sav", "ior"],
  humanity: ["hu", "man", "i", "ty"],
};

export function countWordLetters(word: string) {
  return (word.match(/\p{L}/gu) ?? []).length;
}

function preserveCase(piece: string, source: string, index: number) {
  if (source === source.toUpperCase()) return piece.toUpperCase();
  if (index === 0 && source[0] === source[0]?.toUpperCase()) {
    return piece.charAt(0).toUpperCase() + piece.slice(1);
  }
  return piece;
}

function stripEdges(piece: string) {
  return piece.replace(EDGE_NON_WORD, "");
}

/**
 * Apply a stored/typed split to a word, carrying the word's own leading and
 * trailing punctuation to the first and last piece and matching its
 * capitalisation. Dictionary entries are stored without edges, so one entry
 * covers "Savior", "(savior)" and "SAVIOR".
 */
function applyPieces(word: string, rawPieces: string[]) {
  const match = word.match(WORD_PATTERN);
  const cleaned = rawPieces.map(stripEdges).filter(Boolean);
  const pieces = cleaned.length > 0 ? cleaned : rawPieces.map((piece) => piece.trim()).filter(Boolean);

  if (!match || pieces.length === 0) {
    return pieces.length > 0 ? pieces : [word];
  }

  const [, leading, core, trailing] = match;

  return pieces.map((piece, index) => {
    const cased = preserveCase(piece, core, index);
    const withLeading = index === 0 ? `${leading}${cased}` : cased;
    return index === pieces.length - 1 ? `${withLeading}${trailing}` : withLeading;
  });
}

function splitCoreWord(core: string): string[] {
  const exception = EXCEPTIONS[core.toLowerCase()];
  if (exception) return exception.map((piece, index) => preserveCase(piece, core, index));

  const hyphenated = hyphenateEnglish(core, { hyphenChar: "-" });
  const pieces = hyphenated.split("-").filter(Boolean);
  return pieces.length > 0 ? pieces : [core];
}

/**
 * Pattern-path split: exceptions then the en-US hyphenation dictionary, with
 * no user-dictionary lookup. "Restore automatic" means exactly this.
 */
export function splitWordIntoSyllablesWithPatterns(word: string): string[] {
  const trimmed = word.trim();

  if (!trimmed) {
    return [word];
  }

  const match = trimmed.match(WORD_PATTERN);

  if (!match) return [word];

  const [, leading, core, trailing] = match;
  const pieces = splitCoreWord(core);

  return pieces.map((piece, index) => {
    const withLeading = index === 0 ? `${leading}${piece}` : piece;
    return index === pieces.length - 1 ? `${withLeading}${trailing}` : withLeading;
  });
}

/**
 * Split a word into sung syllables.
 *
 * Order of authority: the user's manual dictionary, curated exceptions, then
 * the en-US hyphenation patterns. The pattern dictionary is orthographic, not
 * phonetic ("everything" -> "every-thing"), so manual entries must win.
 */
export function splitWordIntoSyllables(word: string): string[] {
  const trimmed = word.trim();

  if (!trimmed) {
    return [word];
  }

  const remembered = lookupSyllables(trimmed);

  if (remembered) {
    return applyPieces(trimmed, remembered);
  }

  return splitWordIntoSyllablesWithPatterns(trimmed);
}

/** Hyphen, en/em dash, slash and middot all read as syllable breaks. */
export function splitManualSyllables(input: string): string[] {
  return input
    .split(/[-–—/·•]/)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

/** Leading/trailing punctuation of a word, used by the split-position helper. */
export function wordEdges(word: string) {
  const trimmed = word.trim();
  return {
    leading: trimmed.match(LEADING_EDGE)?.[0] ?? "",
    trailing: trimmed.match(TRAILING_EDGE)?.[0] ?? "",
  };
}
