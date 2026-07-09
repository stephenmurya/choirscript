import { getTechniqueById } from "./defaultTechniques";
import { createId } from "./songStorage";
import type {
  LyricSelection,
  PartKey,
  Song,
  SongLine,
  TechniqueAnnotation,
  VoicePart,
  WordToken,
} from "./songTypes";

export type FlatSyllable = {
  id: string;
  text: string;
  word: WordToken;
  wordIndex: number;
  syllableIndex: number;
  absoluteIndex: number;
};

export type TechniqueRange = {
  id: string;
  annotation: TechniqueAnnotation;
  techniqueId: string;
  syllableIds: string[];
  startIndex: number;
  endIndex: number;
};

export type TechniqueRangePlacement = TechniqueRange & {
  row: number;
};

export const VOICE_LABELS: Record<VoicePart, string> = {
  all: "All",
  soprano: "Soprano",
  alto: "Alto",
  tenor: "Tenor",
  bass: "Bass",
};

export const PART_LABELS: Array<{ key: PartKey; label: string }> = [
  { key: "soprano", label: "Soprano" },
  { key: "alto", label: "Alto" },
  { key: "tenor", label: "Tenor" },
  { key: "bass", label: "Bass" },
];

export function flattenLineSyllables(line: SongLine): FlatSyllable[] {
  let absoluteIndex = 0;

  return line.words.flatMap((word, wordIndex) =>
    word.syllables.map((syllable, syllableIndex) => ({
      id: syllable.id,
      text: syllable.text,
      word,
      wordIndex,
      syllableIndex,
      absoluteIndex: absoluteIndex++,
    })),
  );
}

export function getLineSyllableText(line: SongLine, syllableIds: Iterable<string>) {
  const selectedSet = new Set(syllableIds);

  return flattenLineSyllables(line)
    .filter((syllable) => selectedSet.has(syllable.id))
    .map((syllable) => syllable.text)
    .join("-");
}

export function getSongSyllableIds(song: Song) {
  return song.sections.flatMap((section) =>
    section.lines.flatMap((line) => flattenLineSyllables(line).map((syllable) => syllable.id)),
  );
}

export function getSyllableRange(song: Song, fromId: string, toId: string) {
  const ids = getSongSyllableIds(song);
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);

  if (fromIndex === -1 || toIndex === -1) {
    return [toId];
  }

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return ids.slice(start, end + 1);
}

export function getSyllableRangeInLine(line: SongLine, fromId: string, toId: string) {
  const ids = flattenLineSyllables(line).map((syllable) => syllable.id);
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);

  if (fromIndex === -1 || toIndex === -1) {
    return [toId];
  }

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return ids.slice(start, end + 1);
}

export function getAnnotationsForSyllable(line: SongLine, syllableId: string) {
  return line.annotations.filter((annotation) => annotation.syllableIds.includes(syllableId));
}

export function getPrimaryAnnotation(line: SongLine, syllableId: string) {
  return getAnnotationsForSyllable(line, syllableId)[0];
}

export function groupTechniqueRanges(line: SongLine): TechniqueRange[] {
  const syllableIndexMap = new Map(
    flattenLineSyllables(line).map((syllable) => [syllable.id, syllable.absoluteIndex]),
  );
  const ranges: TechniqueRange[] = [];

  line.annotations.forEach((annotation) => {
    const orderedIndexes = annotation.syllableIds
      .map((id) => ({ id, index: syllableIndexMap.get(id) }))
      .filter((item): item is { id: string; index: number } => item.index !== undefined)
      .toSorted((a, b) => a.index - b.index);

    let currentIds: string[] = [];
    let startIndex: number | null = null;
    let previousIndex: number | null = null;

    function flushRange() {
      if (startIndex === null || previousIndex === null || currentIds.length === 0) {
        return;
      }

      ranges.push({
        id: `${annotation.id}-${startIndex}-${previousIndex}`,
        annotation,
        techniqueId: annotation.techniqueId,
        syllableIds: currentIds,
        startIndex,
        endIndex: previousIndex,
      });
    }

    orderedIndexes.forEach((item) => {
      if (previousIndex !== null && item.index !== previousIndex + 1) {
        flushRange();
        currentIds = [];
        startIndex = item.index;
      }

      if (startIndex === null) {
        startIndex = item.index;
      }

      currentIds.push(item.id);
      previousIndex = item.index;
    });

    flushRange();
  });

  return ranges.toSorted((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

export function groupTechniqueDisplayRanges(line: SongLine): TechniqueRange[] {
  const flatSyllables = flattenLineSyllables(line);
  const syllableIndexMap = new Map(flatSyllables.map((syllable) => [syllable.id, syllable.absoluteIndex]));
  const syllableIdByIndex = new Map(flatSyllables.map((syllable) => [syllable.absoluteIndex, syllable.id]));
  const annotationByTechnique = new Map<string, TechniqueAnnotation>();
  const indexesByTechnique = new Map<string, Set<number>>();
  const ranges: TechniqueRange[] = [];

  line.annotations.forEach((annotation) => {
    if (!annotationByTechnique.has(annotation.techniqueId)) {
      annotationByTechnique.set(annotation.techniqueId, annotation);
    }

    const indexes = indexesByTechnique.get(annotation.techniqueId) ?? new Set<number>();

    annotation.syllableIds.forEach((syllableId) => {
      const index = syllableIndexMap.get(syllableId);

      if (index !== undefined) {
        indexes.add(index);
      }
    });

    indexesByTechnique.set(annotation.techniqueId, indexes);
  });

  indexesByTechnique.forEach((indexes, techniqueId) => {
    const annotation = annotationByTechnique.get(techniqueId);

    if (!annotation) {
      return;
    }

    const rangeAnnotation = annotation;
    const orderedIndexes = [...indexes].toSorted((a, b) => a - b);
    let startIndex: number | null = null;
    let previousIndex: number | null = null;

    function flushRange() {
      if (startIndex === null || previousIndex === null) {
        return;
      }

      const start = startIndex;
      const end = previousIndex;
      const syllableIds = Array.from(
        { length: end - start + 1 },
        (_, offset) => syllableIdByIndex.get(start + offset),
      ).filter((id): id is string => Boolean(id));

      if (syllableIds.length === 0) {
        return;
      }

      ranges.push({
        id: `${techniqueId}-${start}-${end}`,
        annotation: rangeAnnotation,
        techniqueId,
        syllableIds,
        startIndex: start,
        endIndex: end,
      });
    }

    orderedIndexes.forEach((index) => {
      if (previousIndex !== null && index !== previousIndex + 1) {
        flushRange();
        startIndex = index;
      }

      if (startIndex === null) {
        startIndex = index;
      }

      previousIndex = index;
    });

    flushRange();
  });

  return ranges.toSorted((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

export function arrangeTechniqueRangeRows(ranges: TechniqueRange[]): TechniqueRangePlacement[] {
  const rows: TechniqueRange[][] = [];

  return ranges.map((range) => {
    const row = rows.findIndex((rowRanges) =>
      rowRanges.every(
        (placedRange) =>
          range.endIndex < placedRange.startIndex || range.startIndex > placedRange.endIndex,
      ),
    );
    const nextRow = row === -1 ? rows.length : row;

    rows[nextRow] = [...(rows[nextRow] ?? []), range];

    return {
      ...range,
      row: nextRow,
    };
  });
}

export function formatVoices(voices: VoicePart[]) {
  if (voices.includes("all") || voices.length === 0) {
    return "All";
  }

  return voices.map((voice) => VOICE_LABELS[voice]).join(", ");
}

export function formatAnnotationLabel(annotation: TechniqueAnnotation) {
  const technique = getTechniqueById(annotation.techniqueId);

  if (!technique) {
    return "Unknown";
  }

  return `${technique.symbol} ${annotation.label || technique.name} - ${formatVoices(
    annotation.appliesTo,
  )}`;
}

export function findAnnotation(
  song: Song,
  annotationId: string | null,
): { line: SongLine; annotation: TechniqueAnnotation } | null {
  if (!annotationId) {
    return null;
  }

  for (const section of song.sections) {
    for (const line of section.lines) {
      const annotation = line.annotations.find((item) => item.id === annotationId);

      if (annotation) {
        return { line, annotation };
      }
    }
  }

  return null;
}

export function applyTechniqueToSyllables(
  song: Song,
  selection: NonNullable<LyricSelection>,
  techniqueId: string,
): Song {
  return {
    ...song,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => {
        if (line.id !== selection.lineId) {
          return line;
        }

        const selectedSet = new Set(selection.selectedSyllableIds);
        const lineSyllableIds = flattenLineSyllables(line)
          .map((syllable) => syllable.id)
          .filter((id) => selectedSet.has(id));

        if (lineSyllableIds.length === 0) {
          return line;
        }

        return {
          ...line,
          annotations: [
            ...line.annotations,
            {
              id: createId("annotation"),
              techniqueId,
              syllableIds: lineSyllableIds,
              appliesTo: ["all"],
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }),
    })),
  };
}

export function removeTechniqueFromSyllables(
  song: Song,
  selection: NonNullable<LyricSelection>,
  techniqueId: string,
): Song {
  const selectedSet = new Set(selection.selectedSyllableIds);

  return {
    ...song,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => {
        if (line.id !== selection.lineId) {
          return line;
        }

        return {
          ...line,
          annotations: line.annotations
            .map((annotation) =>
              annotation.techniqueId === techniqueId
                ? {
                    ...annotation,
                    syllableIds: annotation.syllableIds.filter((id) => !selectedSet.has(id)),
                  }
                : annotation,
            )
            .filter((annotation) => annotation.syllableIds.length > 0),
        };
      }),
    })),
  };
}
