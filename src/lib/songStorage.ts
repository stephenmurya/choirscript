import { DEFAULT_TECHNIQUES } from "./defaultTechniques";
import { splitWordIntoSyllables } from "./syllableSplitter";
import { DEFAULT_TIMING_SETTINGS, ensureTimingForSong, migrateSongTiming } from "./timing";
import type {
  Song,
  SongLine,
  SongSection,
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

export function createEmptySection(name = "Verse 1"): SongSection {
  return {
    id: createId("section"),
    name,
    lines: [],
  };
}

export function createEmptySong(): Song {
  const now = new Date().toISOString();

  return {
    id: createId("song"),
    title: "Untitled Song",
    artist: "",
    key: "",
    tempo: "",
    notes: "",
    mode: "simple",
    sections: [createEmptySection()],
    timingSettings: DEFAULT_TIMING_SETTINGS,
    timingByLine: {},
    createdAt: now,
    updatedAt: now,
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

  return {
    id: createId("song"),
    title: "Amazing Grace Demo",
    artist: "Traditional",
    key: "G",
    tempo: "Slow 72 BPM",
    notes: "Teach the melody by call-and-response, then add harmony cues one line at a time.",
    mode: "simple",
    sections: [
      {
        id: createId("section"),
        name: "Verse 1",
        lines: verseLines,
      },
    ],
    timingSettings: DEFAULT_TIMING_SETTINGS,
    timingByLine: {},
    createdAt: now,
    updatedAt: now,
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

function normalizeSong(song: Song): Song {
  const now = new Date().toISOString();

  const normalizedSong = migrateSongTiming({
    ...song,
    id: song.id || createId("song"),
    title: (song.title ?? "").trim() || "Untitled Song",
    updatedAt: song.updatedAt || now,
    createdAt: song.createdAt || now,
    sections: (song.sections ?? []).map((section, sectionIndex) => ({
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
  });

  return normalizedSong.mode === "advanced"
    ? ensureTimingForSong(normalizedSong)
    : normalizedSong;
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

export function duplicateSong(song: Song): Song {
  const now = new Date().toISOString();
  const normalizedSong = normalizeSong(song);

  return {
    ...normalizedSong,
    id: createId("song"),
    title: `${normalizedSong.title || "Untitled Song"} Copy`,
    createdAt: now,
    updatedAt: now,
    sections: normalizedSong.sections.map((section) => ({
      ...section,
      id: createId("section"),
      lines: section.lines.map((line) => {
        const syllableIdMap = new Map<string, string>();
        const words = line.words.map((word) => ({
          ...word,
          id: createId("word"),
          syllables: word.syllables.map((syllable) => {
            const nextId = createId("syllable");
            syllableIdMap.set(syllable.id, nextId);

            return {
              ...syllable,
              id: nextId,
              techniques: syllable.techniques.map((technique) => ({ ...technique })),
            };
          }),
        }));

        return {
          ...line,
          id: createId("line"),
          words,
          annotations: line.annotations.map((annotation) => ({
            ...annotation,
            id: createId("annotation"),
            syllableIds: annotation.syllableIds
              .map((id) => syllableIdMap.get(id))
              .filter(Boolean) as string[],
            appliesTo: [...annotation.appliesTo],
          })),
        };
      }),
    })),
  };
}
