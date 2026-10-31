import type { Song, SongLine, SourceSection, SyllableToken, VocalPart } from "./songTypes";

/**
 * Voice-part transfer helpers. A syllable owns one notation string per part,
 * so a transfer only rewrites those strings — timing, annotations and every
 * other syllable field stay untouched. Pure: inputs are never mutated.
 */

export type PartTransferMode = "move" | "swap";

function readPart(syllable: SyllableToken, part: VocalPart): string {
  return syllable[part] ?? "";
}

function writePart(syllable: SyllableToken, part: VocalPart, value: string): SyllableToken {
  switch (part) {
    case "soprano":
      return { ...syllable, soprano: value };
    case "alto":
      return { ...syllable, alto: value };
    case "tenor":
      return { ...syllable, tenor: value };
    case "bass": {
      if (value !== "") {
        return { ...syllable, bass: value };
      }

      const next = { ...syllable };
      delete next.bass;
      return next;
    }
  }
}

function transferSyllable(
  syllable: SyllableToken,
  from: VocalPart,
  to: VocalPart,
  mode: PartTransferMode,
): SyllableToken {
  const fromValue = readPart(syllable, from);
  const toValue = readPart(syllable, to);

  if (mode === "move") {
    if (fromValue === "") {
      return syllable;
    }

    return writePart(writePart(syllable, from, ""), to, fromValue);
  }

  if (fromValue === toValue) {
    return syllable;
  }

  return writePart(writePart(syllable, from, toValue), to, fromValue);
}

type LineTransfer = {
  line: SongLine;
  syllablesChanged: number;
};

function transferLine(
  line: SongLine,
  from: VocalPart,
  to: VocalPart,
  mode: PartTransferMode,
): LineTransfer {
  let syllablesChanged = 0;

  const words = line.words.map((word) => {
    let wordChanged = false;

    const syllables = word.syllables.map((syllable) => {
      const next = transferSyllable(syllable, from, to, mode);

      if (next === syllable) {
        return syllable;
      }

      syllablesChanged += 1;
      wordChanged = true;
      return next;
    });

    return wordChanged ? { ...word, syllables } : word;
  });

  return syllablesChanged === 0
    ? { line, syllablesChanged }
    : { line: { ...line, words }, syllablesChanged };
}

export function transferLinePart(
  line: SongLine,
  from: VocalPart,
  to: VocalPart,
  mode: PartTransferMode,
): SongLine {
  if (from === to) {
    return line;
  }

  return transferLine(line, from, to, mode).line;
}

export function transferSectionPart(
  section: SourceSection,
  from: VocalPart,
  to: VocalPart,
  mode: PartTransferMode,
): SourceSection {
  if (from === to) {
    return section;
  }

  let syllablesChanged = 0;

  const lines = section.lines.map((line) => {
    const result = transferLine(line, from, to, mode);
    syllablesChanged += result.syllablesChanged;
    return result.line;
  });

  return syllablesChanged === 0 ? section : { ...section, lines };
}

export function transferSongPart(
  song: Song,
  from: VocalPart,
  to: VocalPart,
  mode: PartTransferMode,
): { song: Song; syllablesChanged: number } {
  if (from === to) {
    return { song, syllablesChanged: 0 };
  }

  let syllablesChanged = 0;

  const sections = song.source.sections.map((section) => {
    let sectionChanged = false;

    const lines = section.lines.map((line) => {
      const result = transferLine(line, from, to, mode);

      if (result.syllablesChanged === 0) {
        return line;
      }

      sectionChanged = true;
      syllablesChanged += result.syllablesChanged;
      return result.line;
    });

    return sectionChanged ? { ...section, lines } : section;
  });

  if (syllablesChanged === 0) {
    return { song, syllablesChanged: 0 };
  }

  return {
    song: { ...song, source: { ...song.source, sections } },
    syllablesChanged,
  };
}
