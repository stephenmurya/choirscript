import { createSyllableToken, createWordToken } from "@/lib/songStorage";
import { splitWordIntoSyllables } from "@/lib/syllableSplitter";
import type { LineTiming, Song, SongLine, SyllableToken, WordToken } from "@/lib/songTypes";

function wordsFromText(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function comparisonKey(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9'’]/gi, "");
}

function longestCommonSubsequence(existing: WordToken[], nextWords: string[]) {
  const rows = existing.length + 1;
  const columns = nextWords.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      table[row][column] = comparisonKey(existing[row - 1].originalWord) === comparisonKey(nextWords[column - 1])
        ? table[row - 1][column - 1] + 1
        : Math.max(table[row - 1][column], table[row][column - 1]);
    }
  }

  const matches: Array<[number, number]> = [];
  let row = existing.length;
  let column = nextWords.length;
  while (row > 0 && column > 0) {
    if (comparisonKey(existing[row - 1].originalWord) === comparisonKey(nextWords[column - 1])) {
      matches.unshift([row - 1, column - 1]);
      row -= 1;
      column -= 1;
    } else if (table[row - 1][column] >= table[row][column - 1]) {
      row -= 1;
    } else {
      column -= 1;
    }
  }
  return matches;
}

function updateWordSurface(word: WordToken, nextText: string): WordToken {
  const nextMatch = nextText.match(/^([^A-Za-z0-9'’]*)([A-Za-z0-9'’]+)([^A-Za-z0-9]*)$/);
  if (!nextMatch || word.syllables.length === 1) {
    return { ...word, originalWord: nextText, syllables: word.syllables.map((syllable) => ({ ...syllable, text: nextText })) };
  }

  const [, leading, , trailing] = nextMatch;
  const syllables = word.syllables.map((syllable, index) => {
    const text = syllable.text.replace(/^[^A-Za-z0-9'’]*/, "").replace(/[^A-Za-z0-9'’]*$/, "");
    return {
      ...syllable,
      text: `${index === 0 ? leading : ""}${text}${index === word.syllables.length - 1 ? trailing : ""}`,
    };
  });
  return { ...word, originalWord: nextText, syllables };
}

/**
 * Reconcile a plain lyric edit against the existing word/token structure.
 * LCS keeps unchanged words, including their IDs and musical fields, while
 * inserted words begin as pending unsyllabified words.
 */
export function reconcileLineText(existingLine: SongLine, nextText: string): SongLine {
  const nextWords = wordsFromText(nextText);
  const matches = longestCommonSubsequence(existingLine.words, nextWords);
  const matchedByNextIndex = new Map(matches.map(([oldIndex, nextIndex]) => [nextIndex, existingLine.words[oldIndex]]));
  const words = nextWords.map((word, index) => {
    const existingWord = matchedByNextIndex.get(index);
    return existingWord ? updateWordSurface(existingWord, word) : createWordToken(word, "pending");
  });
  const validSyllableIds = new Set(words.flatMap((word) => word.syllables.map((syllable) => syllable.id)));
  return {
    ...existingLine,
    words,
    annotations: existingLine.annotations
      .map((annotation) => ({ ...annotation, syllableIds: annotation.syllableIds.filter((id) => validSyllableIds.has(id)) }))
      .filter((annotation) => annotation.syllableIds.length > 0),
  };
}

function updateTimingEvents(events: LineTiming["sharedEvents"], syllables: Map<string, SyllableToken>) {
  return events
    .filter((event) => event.type !== "syllable" || Boolean(event.syllableId && syllables.has(event.syllableId)))
    .map((event) => event.syllableId && syllables.has(event.syllableId) ? { ...event, label: syllables.get(event.syllableId)?.text ?? event.label } : event);
}

/** Preserve existing timing where its syllable IDs still exist after a text edit. */
export function reconcileLineTiming(lineTiming: LineTiming, line: SongLine): LineTiming {
  const syllables = new Map(line.words.flatMap((word) => word.syllables).map((syllable) => [syllable.id, syllable]));
  return {
    ...lineTiming,
    sharedEvents: updateTimingEvents(lineTiming.sharedEvents, syllables),
    partOverrides: Object.fromEntries(Object.entries(lineTiming.partOverrides).map(([part, events]) => [part, events ? updateTimingEvents(events, syllables) : events])),
  };
}

/** Prepare pending lyric words once when the editor enters Parts. */
export function preparePendingSyllabification(song: Song): { song: Song; changed: boolean } {
  let changed = false;
  const sections = song.source.sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      words: line.words.map((word) => {
        if (word.syllabification !== "pending") return word;
        changed = true;
        const pieces = splitWordIntoSyllables(word.originalWord);
        return {
          ...word,
          syllabification: "auto" as const,
          syllables: pieces.map((text, index) => {
            const existing = word.syllables[index];
            return existing ? { ...existing, text } : createSyllableToken(text);
          }),
        };
      }),
    })),
  }));
  return changed ? { song: { ...song, source: { sections } }, changed } : { song, changed };
}
