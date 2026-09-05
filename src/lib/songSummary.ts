import type { Song, SongSection } from "@/lib/songTypes";
import type { SongCardSummary, SongModuleKey } from "@/lib/firebase/types";

/**
 * Song card summary derivation.
 *
 * Owns the rules for which project modules contain real content, derived
 * purely from the Song document. The repository layer calls this on every
 * save so the lightweight metadata document carries an up-to-date summary;
 * workspace cards render from metadata alone and never need document/current.
 *
 * FUTURE MODULES (documented contract):
 * - Phase 3 Arrangement: when a project contains a real arrangement, add
 *   "arrangement" here.
 * - Band: when Band content exists, add "band".
 * - Production: when Production content exists, add "production".
 * Presence is PER PROJECT — never "does the feature exist app-wide".
 * Do not create fake fields for unbuilt modules; presence derives from the
 * actual Song document only.
 */

export const SONG_MODULE_KEYS: readonly SongModuleKey[] = [
  "lyrics",
  "vocalParts",
  "arrangement",
  "band",
  "production",
] as const;

function hasMeaningfulText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Meaningful lyric text: any word token with non-empty syllable text. */
function sectionHasLyrics(section: SongSection): boolean {
  return section.lines.some((line) =>
    line.words.some((word) =>
      word.syllables.some((syllable) => hasMeaningfulText(syllable.text)),
    ),
  );
}

/** Meaningful SATB cue on any syllable in the section. */
function sectionHasVocalPartCues(section: SongSection): boolean {
  return section.lines.some((line) =>
    line.words.some((word) =>
      word.syllables.some(
        (syllable) =>
          hasMeaningfulText(syllable.soprano) ||
          hasMeaningfulText(syllable.alto) ||
          hasMeaningfulText(syllable.tenor) ||
          hasMeaningfulText(syllable.bass),
      ),
    ),
  );
}

/**
 * Derive which modules currently contain content for this Song.
 * Pure function — no Firestore, no React.
 */
export function deriveSongModulePresence(song: Song): SongModuleKey[] {
  const modules: SongModuleKey[] = [];

  // LYRICS — present when the song contains meaningful lyric text (not just
  // an empty default section/object).
  if (song.sections.some(sectionHasLyrics)) {
    modules.push("lyrics");
  }

  // VOCAL PARTS — present when real SATB cues exist on any syllable (not
  // merely because the SATB fields structurally exist).
  if (song.sections.some(sectionHasVocalPartCues)) {
    modules.push("vocalParts");
  }

  // ARRANGEMENT / BAND / PRODUCTION — not implemented yet. Never fake data:
  // presence will be added by their future save-path derivations.

  return modules;
}

/**
 * Build the versioned card summary for a Song. Callers supply the contributor
 * information from the owning context (today: the acting user; future: real
 * collaboration data).
 */
export function buildSongCardSummary(
  song: Song,
  contributor: { uid: string; displayName: string; photoURL?: string },
): SongCardSummary {
  return {
    version: 1,
    modules: deriveSongModulePresence(song),
    contributors: {
      total: contributor.uid ? 1 : 0,
      preview: contributor.uid
        ? [
            {
              uid: contributor.uid,
              displayName: contributor.displayName,
              photoURL: contributor.photoURL,
            },
          ]
        : [],
    },
  };
}
