const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

const EXCEPTIONS: Record<string, string[]> = {
  amazing: ["A", "maz", "ing"],
  hallelujah: ["Hal", "le", "lu", "jah"],
  glory: ["glo", "ry"],
  forever: ["for", "ev", "er"],
  savior: ["sav", "ior"],
};

function isVowel(char: string) {
  return VOWELS.has(char.toLowerCase());
}

function hasLaterVowel(value: string, fromIndex: number) {
  for (let index = fromIndex; index < value.length; index += 1) {
    if (isVowel(value[index])) {
      return true;
    }
  }

  return false;
}

function splitCoreWord(core: string): string[] {
  const lower = core.toLowerCase();

  if (EXCEPTIONS[lower]) {
    const pieces = EXCEPTIONS[lower];
    return pieces.map((piece, index) => {
      if (index === 0 && /^[A-Z]/.test(core)) {
        return piece.charAt(0).toUpperCase() + piece.slice(1);
      }

      return piece;
    });
  }

  if (core.length <= 5 || !core.split("").some(isVowel)) {
    return [core];
  }

  const syllables: string[] = [];
  let index = 0;

  while (index < core.length) {
    const start = index;

    while (index < core.length && !isVowel(core[index])) {
      index += 1;
    }

    while (index < core.length && isVowel(core[index])) {
      index += 1;
    }

    if (!hasLaterVowel(core, index)) {
      syllables.push(core.slice(start));
      break;
    }

    let consonantCount = 0;
    while (
      index + consonantCount < core.length &&
      !isVowel(core[index + consonantCount])
    ) {
      consonantCount += 1;
    }

    let boundary = index;

    if (consonantCount === 1) {
      boundary = start === 0 && isVowel(core[start]) ? index : index;
    }

    if (consonantCount > 1) {
      boundary = index + 1;
    }

    syllables.push(core.slice(start, boundary));
    index = boundary;
  }

  return syllables.filter(Boolean);
}

export function splitWordIntoSyllables(word: string): string[] {
  const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9'’]+)([^A-Za-z0-9]*)$/);

  if (!match) {
    return [word];
  }

  const [, leading, core, trailing] = match;
  const pieces = splitCoreWord(core);

  if (pieces.length === 1) {
    return [`${leading}${pieces[0]}${trailing}`];
  }

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
