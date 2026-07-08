import type { Song, SongLine, SongSection, SyllableToken, WordToken } from "./songTypes";

export type SyllableSelectionContext = {
  section: SongSection;
  line: SongLine;
  word: WordToken;
  syllable: SyllableToken;
};

export function getSelectionContexts(
  song: Song,
  selectedIds: Iterable<string>,
): SyllableSelectionContext[] {
  const selectedSet = new Set(selectedIds);
  const contexts: SyllableSelectionContext[] = [];

  song.sections.forEach((section) => {
    section.lines.forEach((line) => {
      line.words.forEach((word) => {
        word.syllables.forEach((syllable) => {
          if (selectedSet.has(syllable.id)) {
            contexts.push({ section, line, word, syllable });
          }
        });
      });
    });
  });

  return contexts;
}

export function getLineSyllableIds(line: SongLine) {
  return line.words.flatMap((word) => word.syllables.map((syllable) => syllable.id));
}

export function getWordSyllableIds(word: WordToken) {
  return word.syllables.map((syllable) => syllable.id);
}

export function songHasBass(song: Song) {
  return song.sections.some((section) =>
    section.lines.some((line) =>
      line.words.some((word) =>
        word.syllables.some((syllable) => Boolean(syllable.bass?.trim())),
      ),
    ),
  );
}
