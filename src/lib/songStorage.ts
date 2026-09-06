import { DEFAULT_TECHNIQUES } from "./defaultTechniques";
import { splitWordIntoSyllables } from "./syllableSplitter";
import { DEFAULT_TIMING_SETTINGS, ensureTimingForSong, migrateSongTiming } from "./timing";
import { migrateSongToSourceArrangement, normalizeRepeatCount } from "./arrangement";
import type {
  Arrangement,
  Song,
  SongLine,
  SourceSection,
  SyllableToken,
  TechniqueAnnotation,
  WordToken,
} from "./songTypes";

const STORAGE_KEY = "choirscript.songs.v1";

export function createId(prefix = "id") {
  const randomValue =
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomValue}`;
}

export function createSyllableToken(text: string): SyllableToken {
  return {
    id: createId("syllable"),
    text,
    soprano: "",
    alto: "",
    tenor: "",
    techniques: [],
  };
}

export function createWordToken(originalWord: string): WordToken {
  return {
    id: createId("word"),
    originalWord,
    syllables: splitWordIntoSyllables(originalWord).map(createSyllableToken),
  };
}

export function createLineFromText(text: string): SongLine {
  return {
    id: createId("line"),
    words: text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(createWordToken),
    annotations: [],
  };
}

export function createEmptySection(name = "Verse 1"): SourceSection {
  return {
    id: createId("section"),
    name,
    lines: [],
  };
}

export function createDefaultArrangement(sections: SourceSection[]): Arrangement {
  return {
    id: createId("arr"),
    name: "Default",
    occurrences: sections.map((section) => ({
      id: createId("occ"),
      sourceSectionId: section.id,
      repeatCount: 1,
    })),
  };
}

export function createEmptySong(): Song {
  const now = new Date().toISOString();
  const arrangement = createDefaultArrangement([]);

  return {
    id: createId("song"),
    title: "Untitled Song",
    artist: "",
    key: "",
    tempo: "",
    notes: "",
    mode: "simple",
    bassEnabled: false,
    source: { sections: [] },
    arrangements: [arrangement],
    activeArrangementId: arrangement.id,
    timingSettings: DEFAULT_TIMING_SETTINGS,
    timingByLine: {},
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}

function flattenLineSyllables(line: SongLine) {
  return line.words.flatMap((word) => word.syllables);
}

function applySampleParts(line: SongLine, soprano: string[], alto: string[], tenor: string[]) {
  flattenLineSyllables(line).forEach((syllable, index) => {
    syllable.soprano = soprano[index % soprano.length] ?? "";
    syllable.alto = alto[index % alto.length] ?? "";
    syllable.tenor = tenor[index % tenor.length] ?? "";
  });
}

function addTechnique(line: SongLine, syllableIndex: number, techniqueId: string) {
  const syllable = flattenLineSyllables(line)[syllableIndex];

  if (syllable) {
    syllable.techniques.push({ techniqueId });
    line.annotations.push({
      id: createId("annotation"),
      techniqueId,
      syllableIds: [syllable.id],
      appliesTo: ["all"],
      createdAt: new Date().toISOString(),
    });
  }
}

function addPhraseTechnique(line: SongLine, syllableIndexes: number[], techniqueId: string) {
  const syllables = flattenLineSyllables(line);
  const syllableIds = syllableIndexes
    .map((index) => syllables[index]?.id)
    .filter(Boolean) as string[];

  if (syllableIds.length === 0) {
    return;
  }

  syllableIds.forEach((id) => {
    const syllable = syllables.find((item) => item.id === id);

    if (
      syllable &&
      !syllable.techniques.some((technique) => technique.techniqueId === techniqueId)
    ) {
      syllable.techniques.push({ techniqueId });
    }
  });

  line.annotations.push({
    id: createId("annotation"),
    techniqueId,
    syllableIds,
    appliesTo: ["all"],
    createdAt: new Date().toISOString(),
  });
}

export function createSampleSong(): Song {
  const now = new Date().toISOString();
  const verseLines = [
    createLineFromText("Amazing grace how sweet the sound"),
    createLineFromText("That saved a wretch like me"),
    createLineFromText("I once was lost but now am found"),
  ];

  applySampleParts(
    verseLines[0],
    ["Do", "Re", "Mi", "Fa", "So", "La"],
    ["Mi", "Fa", "So", "La", "Ti", "Do"],
    ["Do", "Do", "Re", "Mi", "Fa", "So"],
  );
  applySampleParts(
    verseLines[1],
    ["So", "La", "So", "Mi", "Re"],
    ["Mi", "Fa", "Mi", "Do", "Ti"],
    ["Do", "Re", "Do", "La", "So"],
  );
  applySampleParts(
    verseLines[2],
    ["Mi", "Fa", "So", "So", "La", "So", "Mi"],
    ["Do", "Re", "Mi", "Mi", "Fa", "Mi", "Do"],
    ["So", "So", "Do", "Do", "Re", "Do", "So"],
  );

  addPhraseTechnique(verseLines[0], [0, 1], DEFAULT_TECHNIQUES[0].id);
  addTechnique(verseLines[0], 2, DEFAULT_TECHNIQUES[1].id);
  addTechnique(verseLines[0], 5, DEFAULT_TECHNIQUES[3].id);
  addTechnique(verseLines[1], 1, DEFAULT_TECHNIQUES[2].id);
  addTechnique(verseLines[2], 4, DEFAULT_TECHNIQUES[6].id);
  addTechnique(verseLines[2], 6, DEFAULT_TECHNIQUES[7].id);

  flattenLineSyllables(verseLines[0])[2].directorNote = "Keep the vowel tall.";
  flattenLineSyllables(verseLines[2])[6].directorNote = "Clean cutoff together.";

  const section: SourceSection = {
    id: createId("section"),
    name: "Verse 1",
    lines: verseLines,
  };
  const arrangement = createDefaultArrangement([section]);

  return {
    id: createId("song"),
    title: "Amazing Grace Demo",
    artist: "Traditional",
    key: "G",
    tempo: "Slow 72 BPM",
    notes: "Teach the melody by call-and-response, then add harmony cues one line at a time.",
    mode: "simple",
    bassEnabled: false,
    source: { sections: [section] },
    arrangements: [arrangement],
    activeArrangementId: arrangement.id,
    timingSettings: DEFAULT_TIMING_SETTINGS,
    timingByLine: {},
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}

function migrateLineAnnotations(line: SongLine): TechniqueAnnotation[] {
  if (Array.isArray(line.annotations) && line.annotations.length > 0) {
    return line.annotations.map((annotation) => ({
      ...annotation,
      id: annotation.id || createId("annotation"),
      syllableIds: annotation.syllableIds ?? [],
      appliesTo: annotation.appliesTo?.length ? annotation.appliesTo : ["all"],
      createdAt: annotation.createdAt || new Date().toISOString(),
    }));
  }

  const annotations: TechniqueAnnotation[] = [];

  line.words?.forEach((word) => {
    word.syllables?.forEach((syllable) => {
      syllable.techniques?.forEach((technique) => {
        annotations.push({
          id: createId("annotation"),
          techniqueId: technique.techniqueId,
          syllableIds: [syllable.id],
          appliesTo: ["all"],
          note: technique.note,
          createdAt: new Date().toISOString(),
        });
      });
    });
  });

  return annotations;
}

function normalizeCueValue(value?: string) {
  return value === "Sol" ? "So" : value ?? "";
}

/**
 * Canonical sanitizer/migration boundary for song content. Runs on every
 * local load, cloud load and save. Kept independent of localStorage so the
 * cloud repository can reuse it.
 *
 * Schema migration v1→v2 (Phase 3, Source/Arrangement) happens here first:
 * v1 songs get source.sections (moved by reference — IDs preserved) plus a
 * default arrangement mirroring the existing order. Idempotent: already-v2
 * songs pass through unchanged, so repeated normalize calls never create
 * additional arrangements/occurrences. See docs/phase-3-... §L.
 */
export function normalizeSong(input: Song): Song {
  const now = new Date().toISOString();

  // ── v1 → v2 structural migration (by reference; no content rewrite) ──
  const song = migrateSongToSourceArrangement(input as Song & { sections?: SourceSection[] });

  const normalizedSong = migrateSongTiming({
    ...song,
    id: song.id || createId("song"),
    title: (song.title ?? "").trim() || "Untitled Song",
    updatedAt: song.updatedAt || now,
    createdAt: song.createdAt || now,
    schemaVersion: 2,
    source: {
      sections: (song.source?.sections ?? []).map((section, sectionIndex) => ({
        ...section,
        id: section.id || createId("section"),
        name: section.name || `Section ${sectionIndex + 1}`,
        lines: (section.lines ?? []).map((line) => {
          const words = (line.words ?? []).map((word) => ({
            ...word,
            id: word.id || createId("word"),
            originalWord: word.originalWord ?? "",
            syllables: (word.syllables ?? []).map((syllable) => ({
              ...syllable,
              id: syllable.id || createId("syllable"),
              text: syllable.text ?? "",
              soprano: normalizeCueValue(syllable.soprano),
              alto: normalizeCueValue(syllable.alto),
              tenor: normalizeCueValue(syllable.tenor),
              bass: syllable.bass ? normalizeCueValue(syllable.bass) : undefined,
              techniques: syllable.techniques ?? [],
            })),
          }));
          const validSyllableIds = new Set(
            words.flatMap((word) => word.syllables.map((syllable) => syllable.id)),
          );

          return {
            ...line,
            id: line.id || createId("line"),
            words,
            annotations: migrateLineAnnotations({ ...line, words })
              .map((annotation) => ({
                ...annotation,
                syllableIds: annotation.syllableIds.filter((id) => validSyllableIds.has(id)),
              }))
              .filter((annotation) => annotation.syllableIds.length > 0),
          };
        }),
      })),
    },
  });

  const sourceHasBass = normalizedSong.source.sections.some((section) =>
    section.lines.some((line) =>
      line.words.some((word) =>
        word.syllables.some((syllable) => Boolean(syllable.bass?.trim())),
      ),
    ),
  );

  // Arrangement sanitation: drop occurrences whose sourceSectionId no longer
  // resolves (never keep silent danglers), and repair a broken
  // activeArrangementId. Also normalize any arrangement object IDs.
  const sectionIds = new Set(normalizedSong.source.sections.map((section) => section.id));
  const validArrangements: Arrangement[] = (Array.isArray(normalizedSong.arrangements)
    ? normalizedSong.arrangements
    : [])
    .filter(Boolean)
    .map((arrangement) => ({
      ...arrangement,
      id: arrangement.id || createId("arr"),
      name: arrangement.name || "Default",
      occurrences: (Array.isArray(arrangement.occurrences) ? arrangement.occurrences : [])
        .filter((occ) => occ && sectionIds.has(occ.sourceSectionId))
        .map((occ) => ({
          ...occ,
          id: occ.id || createId("occ"),
          note: occ.note?.trim() ? occ.note.trim() : undefined,
          repeatCount: normalizeRepeatCount(occ.repeatCount),
        })),
    }));

  const arrangements = validArrangements.length
    ? validArrangements
    : [
        {
          id: createId("arr"),
          name: "Default",
          occurrences: normalizedSong.source.sections.map((section) => ({
            id: createId("occ"),
            sourceSectionId: section.id,
            repeatCount: 1,
          })),
        },
      ];

  const activeArrangementId = arrangements.some(
    (arrangement) => arrangement.id === normalizedSong.activeArrangementId,
  )
    ? normalizedSong.activeArrangementId
    : arrangements[0].id;

  const withArrangements: Song = {
    ...normalizedSong,
    bassEnabled:
      typeof normalizedSong.bassEnabled === "boolean"
        ? normalizedSong.bassEnabled
        : sourceHasBass,
    arrangements,
    activeArrangementId,
  };

  return withArrangements.mode === "advanced"
    ? ensureTimingForSong(withArrangements)
    : withArrangements;
}

export function loadSongs(): Song[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    const sample = createSampleSong();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
    return [sample];
  }

  try {
    const parsed = JSON.parse(raw) as Song[];
    return Array.isArray(parsed)
      ? parsed.map(normalizeSong).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function saveSongs(songs: Song[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      songs
        .map(normalizeSong)
        .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),
  );
}

export function saveSong(song: Song) {
  const songs = loadSongs().filter((item) => item.id !== song.id);
  saveSongs([{ ...normalizeSong(song), updatedAt: new Date().toISOString() }, ...songs]);
}

export function getSongById(id: string) {
  return loadSongs().find((song) => song.id === id);
}

export function deleteSong(id: string) {
  saveSongs(loadSongs().filter((song) => song.id !== id));
}

/**
 * Duplicate one canonical line in place. Every nested content and timing ID
 * is regenerated so later edits to either line remain independent.
 */
export function duplicateLine(song: Song, sectionId: string, lineId: string): Song {
  const normalizedSong = normalizeSong(song);
  const section = normalizedSong.source.sections.find((candidate) => candidate.id === sectionId);
  const line = section?.lines.find((candidate) => candidate.id === lineId);
  if (!section || !line) {
    return normalizedSong;
  }

  const syllableIdMap = new Map<string, string>();
  const barIdMap = new Map<string, string>();
  const nextLineId = createId("line");

  const duplicatedLine: SongLine = {
    ...line,
    id: nextLineId,
    words: line.words.map((word) => {
      const nextWordId = createId("word");
      return {
        ...word,
        id: nextWordId,
        syllables: word.syllables.map((syllable) => {
          const nextSyllableId = createId("syllable");
          syllableIdMap.set(syllable.id, nextSyllableId);
          return {
            ...syllable,
            id: nextSyllableId,
            techniques: syllable.techniques.map((technique) => ({ ...technique })),
          };
        }),
      };
    }),
    annotations: line.annotations.map((annotation) => {
      const nextAnnotationId = createId("annotation");
      return {
        ...annotation,
        id: nextAnnotationId,
        syllableIds: annotation.syllableIds
          .map((id) => syllableIdMap.get(id))
          .filter((id): id is string => Boolean(id)),
        appliesTo: [...annotation.appliesTo],
      };
    }),
  };

  const originalTiming = normalizedSong.timingByLine[lineId];
  const timingByLine = { ...normalizedSong.timingByLine };
  if (originalTiming) {
    const bars = originalTiming.bars.map((bar) => {
      const nextBarId = createId("bar");
      barIdMap.set(bar.id, nextBarId);
      return { ...bar, id: nextBarId, lineId: nextLineId };
    });
    const remapEvent = (event: (typeof originalTiming.sharedEvents)[number]) => {
      const nextEventId = createId("timingEvent");
      return {
        ...event,
        id: nextEventId,
        lineId: nextLineId,
        barId: barIdMap.get(event.barId) ?? event.barId,
        syllableId: event.syllableId
          ? syllableIdMap.get(event.syllableId) ?? event.syllableId
          : undefined,
      };
    };

    timingByLine[nextLineId] = {
      ...originalTiming,
      lineId: nextLineId,
      bars,
      sharedEvents: originalTiming.sharedEvents.map(remapEvent),
      partOverrides: Object.fromEntries(
        Object.entries(originalTiming.partOverrides).map(([part, events]) => [
          part,
          events?.map(remapEvent),
        ]),
      ),
    };
  }

  return {
    ...normalizedSong,
    source: {
      sections: normalizedSong.source.sections.map((candidate) =>
        candidate.id === sectionId
          ? {
              ...candidate,
              lines: candidate.lines.flatMap((candidateLine) =>
                candidateLine.id === lineId ? [candidateLine, duplicatedLine] : [candidateLine],
              ),
            }
          : candidate,
      ),
    },
    timingByLine,
  };
}

export function duplicateSong(song: Song): Song {
  const now = new Date().toISOString();
  const normalizedSong = normalizeSong(song);

  const sectionIdMap = new Map<string, string>();
  const lineIdMap = new Map<string, string>();
  const wordIdMap = new Map<string, string>();
  const syllableIdMap = new Map<string, string>();
  const annotationIdMap = new Map<string, string>();
  const barIdMap = new Map<string, string>();
  const timingEventIdMap = new Map<string, string>();
  const arrangementIdMap = new Map<string, string>();
  const occurrenceIdMap = new Map<string, string>();

  const sourceSections = normalizedSong.source.sections.map((section) => {
    const nextSectionId = createId("section");
    sectionIdMap.set(section.id, nextSectionId);

    return {
      ...section,
      id: nextSectionId,
      lines: section.lines.map((line) => {
        const nextLineId = createId("line");
        lineIdMap.set(line.id, nextLineId);

        return {
          ...line,
          id: nextLineId,
          words: line.words.map((word) => {
            const nextWordId = createId("word");
            wordIdMap.set(word.id, nextWordId);

            return {
              ...word,
              id: nextWordId,
              syllables: word.syllables.map((syllable) => {
                const nextSyllableId = createId("syllable");
                syllableIdMap.set(syllable.id, nextSyllableId);

                return {
                  ...syllable,
                  id: nextSyllableId,
                  techniques: syllable.techniques.map((technique) => ({ ...technique })),
                };
              }),
            };
          }),
          annotations: line.annotations.map((annotation) => {
            const nextAnnotationId = createId("annotation");
            annotationIdMap.set(annotation.id, nextAnnotationId);

            return {
              ...annotation,
              id: nextAnnotationId,
              syllableIds: annotation.syllableIds
                .map((id) => syllableIdMap.get(id))
                .filter((id): id is string => Boolean(id)),
              appliesTo: [...annotation.appliesTo],
            };
          }),
        };
      }),
    };
  });

  const timingByLine = Object.fromEntries(
    Object.entries(normalizedSong.timingByLine).flatMap(([oldLineId, lineTiming]) => {
      const lineId = lineIdMap.get(oldLineId);
      if (!lineId) {
        return [];
      }

      const remapEvent = (event: (typeof lineTiming.sharedEvents)[number]) => {
        const nextEventId = createId("timingEvent");
        timingEventIdMap.set(event.id, nextEventId);
        return {
          ...event,
          id: nextEventId,
          sectionId: sectionIdMap.get(event.sectionId) ?? event.sectionId,
          lineId,
          barId: barIdMap.get(event.barId) ?? event.barId,
          syllableId: event.syllableId
            ? syllableIdMap.get(event.syllableId) ?? event.syllableId
            : undefined,
        };
      };

      const bars = lineTiming.bars.map((bar) => {
        const nextBarId = createId("bar");
        barIdMap.set(bar.id, nextBarId);
        return {
          ...bar,
          id: nextBarId,
          sectionId: sectionIdMap.get(bar.sectionId) ?? bar.sectionId,
          lineId,
        };
      });

      const remappedTiming = {
        ...lineTiming,
        lineId,
        bars,
        sharedEvents: lineTiming.sharedEvents.map(remapEvent),
        partOverrides: Object.fromEntries(
          Object.entries(lineTiming.partOverrides).map(([part, events]) => [
            part,
            events?.map(remapEvent),
          ]),
        ),
      };

      return [[lineId, remappedTiming]] as const;
    }),
  );

  const arrangements = normalizedSong.arrangements.map((arrangement) => {
    const nextArrangementId = createId("arr");
    arrangementIdMap.set(arrangement.id, nextArrangementId);
    return {
      ...arrangement,
      id: nextArrangementId,
      occurrences: arrangement.occurrences.map((occurrence) => {
        const nextOccurrenceId = createId("occ");
        occurrenceIdMap.set(occurrence.id, nextOccurrenceId);
        return {
          ...occurrence,
          id: nextOccurrenceId,
          sourceSectionId:
            sectionIdMap.get(occurrence.sourceSectionId) ?? occurrence.sourceSectionId,
        };
      }),
    };
  });

  const activeArrangementId =
    arrangementIdMap.get(normalizedSong.activeArrangementId) ?? arrangements[0]?.id ?? createId("arr");

  return {
    ...normalizedSong,
    id: createId("song"),
    title: `${normalizedSong.title || "Untitled Song"} Copy`,
    createdAt: now,
    updatedAt: now,
    source: { sections: sourceSections },
    arrangements,
    activeArrangementId,
    timingByLine,
  };
}
