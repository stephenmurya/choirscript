import type { Song, SongLine, SongSection, SyllableToken, VocalPart, WordToken, VoicePreset } from "./songTypes";

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

  song.source.sections.forEach((section) => {
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
  return song.source.sections.some((section) =>
    section.lines.some((line) =>
      line.words.some((word) =>
        word.syllables.some((syllable) => Boolean(syllable.bass?.trim())),
      ),
    ),
  );
}

export const VOICE_PRESET_LABELS: Record<VoicePreset, string> = {
  satb: "SATB",
  sab: "SAB",
  ssa: "SSA",
  ttbb: "TTBB",
  unison: "Unison",
  custom: "Custom",
};

export const VOICE_PRESET_PARTS: Record<Exclude<VoicePreset, "custom">, VocalPart[]> = {
  satb: ["soprano", "alto", "tenor", "bass"],
  sab: ["soprano", "alto", "bass"],
  ssa: ["soprano", "alto"],
  ttbb: ["tenor", "bass"],
  unison: ["soprano"],
};

export function getEnabledVoiceParts(song: Song): VocalPart[] {
  if (song.enabledParts?.length) return song.enabledParts;
  if (song.voicePreset && song.voicePreset !== "custom") return VOICE_PRESET_PARTS[song.voicePreset];
  return song.bassEnabled || songHasBass(song)
    ? ["soprano", "alto", "tenor", "bass"]
    : ["soprano", "alto", "tenor"];
}

export function songHasPartEntries(song: Song, part: VocalPart) {
  return song.source.sections.some((section) => section.lines.some((line) => line.words.some((word) => word.syllables.some((syllable) => Boolean(syllable[part]?.trim())))));
}
