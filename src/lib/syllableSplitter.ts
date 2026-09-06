import createHyphenator from "hyphen";
import patterns from "hyphen/patterns/en-us";

type Hyphenator = (word: string, options?: { hyphenChar?: string }) => string;

const hyphenateEnglish = createHyphenator(patterns, { sync: true }) as Hyphenator;

/**
 * Hand-hyphenated exceptions for choir vocabulary where English orthographic
 * patterns are too conservative or choose a different acceptable boundary.
 * Manual correction remains the final authority in Parts.
 */
const EXCEPTIONS: Record<string, string[]> = {
  overcame: ["o", "ver", "came"],
  amazing: ["a", "maz", "ing"],
  hallelujah: ["hal", "le", "lu", "jah"],
  forever: ["for", "ev", "er"],
  savior: ["sav", "ior"],
};

function preserveCase(piece: string, source: string, index: number) {
  if (source === source.toUpperCase()) return piece.toUpperCase();
  if (index === 0 && source[0] === source[0]?.toUpperCase()) {
    return piece.charAt(0).toUpperCase() + piece.slice(1);
  }
  return piece;
}

function splitCoreWord(core: string): string[] {
  const exception = EXCEPTIONS[core.toLowerCase()];
  if (exception) return exception.map((piece, index) => preserveCase(piece, core, index));

  const hyphenated = hyphenateEnglish(core, { hyphenChar: "-" });
  const pieces = hyphenated.split("-").filter(Boolean);
  return pieces.length > 0 ? pieces : [core];
}

export function splitWordIntoSyllables(word: string): string[] {
  const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9'’]+)([^A-Za-z0-9]*)$/);

  if (!match) return [word];

  const [, leading, core, trailing] = match;
  const pieces = splitCoreWord(core);
  return pieces.map((piece, index) => {
    const withLeading = index === 0 ? `${leading}${piece}` : piece;
    return index === pieces.length - 1 ? `${withLeading}${trailing}` : withLeading;
  });
}

export function splitManualSyllables(input: string): string[] {
  return input
    .split("-")
    .map((piece) => piece.trim())
    .filter(Boolean);
}
