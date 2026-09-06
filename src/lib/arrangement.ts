import { createId } from "@/lib/songStorage";
import type {
  Arrangement,
  ArrangementOccurrence,
  Song,
  SourceSection,
} from "@/lib/songTypes";

/**
 * Arrangement domain helpers: accessors, resolution and safe mutation.
 * Pure functions — no Firestore, no React. See
 * docs/phase-3-source-arrangement-architecture.md §D/§H/§J.
 */

export type ResolvedSection = {
  occurrenceId: string;
  occurrence: ArrangementOccurrence;
  section: SourceSection;
  repeatIndex: number;
  renderIdentity: string;
};

export const MAX_REPEAT_COUNT = 32;

export function normalizeRepeatCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_REPEAT_COUNT, Math.max(1, Math.floor(value)));
}

/** Get the active arrangement, defensively falling back to the first one. */
export function getActiveArrangement(song: Song): Arrangement | null {
  if (song.arrangements.length === 0) {
    return null;
  }

  return (
    song.arrangements.find((arrangement) => arrangement.id === song.activeArrangementId) ??
    song.arrangements[0]
  );
}

/**
 * Resolve the active arrangement into an ordered render sequence.
 *
 * Occurrences with unresolvable sourceSectionId are dropped (danglers are
 * forbidden). Empty/missing arrangement falls back to Source order — the
 * same sequence migration produces — so rendering never breaks.
 */
export function resolveArrangement(song: Song): ResolvedSection[] {
  const sectionById = new Map(song.source.sections.map((s) => [s.id, s]));
  const arrangement = getActiveArrangement(song);

  const fallbackToSourceOrder = () =>
    song.source.sections.flatMap((section) => {
      const occurrenceId = `fallback:${section.id}`;
      return [{
        occurrenceId,
        occurrence: { id: occurrenceId, sourceSectionId: section.id, repeatCount: 1 },
        section,
        repeatIndex: 0,
        renderIdentity: `${occurrenceId}:0`,
      }];
    });

  if (!arrangement || arrangement.occurrences.length === 0) {
    return fallbackToSourceOrder();
  }

  const resolved = arrangement.occurrences.flatMap((occurrence) => {
      const section = sectionById.get(occurrence.sourceSectionId);
      if (!section) {
        return [];
      }

      const repeatCount = normalizeRepeatCount(occurrence.repeatCount);
      return Array.from({ length: repeatCount }, (_, repeatIndex) => ({
        occurrenceId: occurrence.id,
        occurrence,
        section,
        repeatIndex,
        renderIdentity: `${occurrence.id}:${repeatIndex}`,
      }));
    });

  return resolved.length > 0 ? resolved : fallbackToSourceOrder();
}

/** Occurrence count for a given Source section in the active arrangement. */
export function countOccurrencesForSection(song: Song, sourceSectionId: string): number {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return 0;
  }

  return arrangement.occurrences
    .filter((occ) => occ.sourceSectionId === sourceSectionId)
    .reduce((total, occurrence) => total + normalizeRepeatCount(occurrence.repeatCount), 0);
}

/** Append a Source section to the end of the active arrangement. */
export function appendOccurrence(song: Song, sourceSectionId: string): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return song;
  }

  return updateArrangement(song, arrangement.id, (current) => ({
    ...current,
    occurrences: [
      ...current.occurrences,
      { id: createId("occ"), sourceSectionId, repeatCount: 1 },
    ],
  }));
}

/** Remove one occurrence by id. Never touches Source. */
export function removeOccurrence(song: Song, occurrenceId: string): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return song;
  }

  return updateArrangement(song, arrangement.id, (current) => ({
    ...current,
    occurrences: current.occurrences.filter((occ) => occ.id !== occurrenceId),
  }));
}

/** Move an occurrence up/down one position within the active arrangement. */
export function moveOccurrence(
  song: Song,
  occurrenceId: string,
  direction: "up" | "down",
): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return song;
  }

  const index = arrangement.occurrences.findIndex((occ) => occ.id === occurrenceId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || targetIndex < 0 || targetIndex >= arrangement.occurrences.length) {
    return song;
  }

  const occurrences = [...arrangement.occurrences];
  [occurrences[index], occurrences[targetIndex]] = [
    occurrences[targetIndex],
    occurrences[index],
  ];

  return updateArrangement(song, arrangement.id, (current) => ({
    ...current,
    occurrences,
  }));
}

/** Move an occurrence to the position represented by a drag-and-drop target. */
export function reorderOccurrence(song: Song, occurrenceId: string, overOccurrenceId: string): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement || occurrenceId === overOccurrenceId) {
    return song;
  }

  const fromIndex = arrangement.occurrences.findIndex((occurrence) => occurrence.id === occurrenceId);
  const toIndex = arrangement.occurrences.findIndex((occurrence) => occurrence.id === overOccurrenceId);
  if (fromIndex < 0 || toIndex < 0) {
    return song;
  }

  const occurrences = [...arrangement.occurrences];
  const [moved] = occurrences.splice(fromIndex, 1);
  occurrences.splice(toIndex, 0, moved);
  return updateArrangement(song, arrangement.id, (current) => ({ ...current, occurrences }));
}

export function setOccurrenceRepeatCount(song: Song, occurrenceId: string, repeatCount: number): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return song;
  }

  return updateArrangement(song, arrangement.id, (current) => ({
    ...current,
    occurrences: current.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId
        ? { ...occurrence, repeatCount: normalizeRepeatCount(repeatCount) }
        : occurrence,
    ),
  }));
}

/** Update the active arrangement via an updater (returns a new Song). */
export function updateArrangement(
  song: Song,
  arrangementId: string,
  updater: (arrangement: Arrangement) => Arrangement,
): Song {
  return {
    ...song,
    arrangements: song.arrangements.map((arrangement) =>
      arrangement.id === arrangementId ? updater(arrangement) : arrangement,
    ),
  };
}

/** Update an occurrence note by occurrence id. */
export function setOccurrenceNote(
  song: Song,
  occurrenceId: string,
  note: string | undefined,
): Song {
  const arrangement = getActiveArrangement(song);
  if (!arrangement) {
    return song;
  }

  return updateArrangement(song, arrangement.id, (current) => ({
    ...current,
    occurrences: current.occurrences.map((occ) =>
      occ.id === occurrenceId ? { ...occ, note: note?.trim() ? note.trim() : undefined } : occ,
    ),
  }));
}

/**
 * Delete a Source section and cascade-remove all occurrences referencing it.
 * The caller (UI) is responsible for the explicit usage-count confirmation —
 * this helper performs the mutation only.
 */
export function deleteSourceSectionWithOccurrences(song: Song, sectionId: string): Song {
  const removedLineIds = new Set(
    song.source.sections
      .find((section) => section.id === sectionId)
      ?.lines.map((line) => line.id) ?? [],
  );

  return {
    ...song,
    source: {
      sections: song.source.sections.filter((section) => section.id !== sectionId),
    },
    arrangements: song.arrangements.map((arrangement) => ({
      ...arrangement,
      occurrences: arrangement.occurrences.filter(
        (occ) => occ.sourceSectionId !== sectionId,
      ),
    })),
    timingByLine: Object.fromEntries(
      Object.entries(song.timingByLine).filter(([lineId]) => !removedLineIds.has(lineId)),
    ),
  };
}

/**
 * Deterministic v1→v2 migration (normalizeSong choke point). One existing
 * section becomes one canonical Source section; the default arrangement
 * references them in existing order. NO merging — see architecture §L.
 * Idempotent: guarded by absence of source/arrangements.
 */
export function migrateSongToSourceArrangement(song: Song): Song {
  if (song.source && song.arrangements) {
    return song;
  }

  const sections = (song.source?.sections ?? (song as { sections?: SourceSection[] }).sections ?? [])
    .map((section) => ({ ...section }));

  const defaultArrangement: Arrangement = {
    id: createId("arr"),
    name: "Default",
    occurrences: sections.map((section) => ({
      id: createId("occ"),
      sourceSectionId: section.id,
      repeatCount: 1,
    })),
  };

  return {
    ...song,
    source: { sections },
    arrangements: [defaultArrangement],
    activeArrangementId: defaultArrangement.id,
  } as Song;
}

/**
 * True when the active arrangement represents MEANINGFUL arrangement work
 * (architecture §N): repeats, cuts (sections not placed), reordering, or
 * occurrence notes. A mirror of Source order is the migrated/default state
 * and does NOT count.
 */
export function hasMeaningfulArrangement(song: Song): boolean {
  const arrangement = getActiveArrangement(song);

  if (!arrangement || arrangement.occurrences.length === 0) {
    return false;
  }

  // Repeats: any sourceSectionId used more than once.
  const counts = new Map<string, number>();
  arrangement.occurrences.forEach((occ) => {
    counts.set(occ.sourceSectionId, (counts.get(occ.sourceSectionId) ?? 0) + 1);
  });
  const hasRepeat = [...counts.values()].some((count) => count > 1);
  const hasExplicitRepeat = arrangement.occurrences.some(
    (occurrence) => normalizeRepeatCount(occurrence.repeatCount) > 1,
  );

  // Cuts: sections that exist in Source but are never placed.
  const hasCut = song.source.sections.some((section) => !counts.has(section.id));

  // Reorder: placed sequence differs from Source order (comparing the
  // unique-occurrence projection so repeats don't cause false positives).
  const placedIds = arrangement.occurrences.map((occ) => occ.sourceSectionId);
  const sourceIds = song.source.sections.map((section) => section.id);
  const hasReorder =
    placedIds.length !== sourceIds.length ||
    placedIds.some((id, index) => id !== sourceIds[index] && counts.get(id) === 1);

  // Occurrence notes indicate arrangement-specific intent.
  const hasNotes = arrangement.occurrences.some((occ) => Boolean(occ.note));

  return hasRepeat || hasExplicitRepeat || hasCut || hasNotes || (hasReorder && placedIds.length === sourceIds.length);
}
