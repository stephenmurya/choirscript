"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { applyTechniqueToSyllables, removeTechniqueFromSyllableIds } from "@/lib/annotationUtils";
import {
  createId,
  createEmptySection,
  createDefaultArrangement,
  createLineFromText,
  duplicateLine,
  deleteLine,
  createSyllableToken,
  normalizeSong,
} from "@/lib/songStorage";
import { getEnabledVoiceParts } from "@/lib/songSelection";
import { parseLyricsInput } from "@/lib/lyricsParser";
import { preparePendingSyllabification, reconcileLineText, reconcileLineTiming } from "@/lib/lineText";
import { splitWordIntoSyllables } from "@/lib/syllableSplitter";
import {
  appendOccurrence,
  countOccurrencesForSection,
  deleteSourceSectionWithOccurrences,
  moveOccurrence,
  reorderOccurrence,
  removeOccurrence,
  setOccurrenceRepeatCount,
  setOccurrenceNote,
} from "@/lib/arrangement";
import { getSongWithMeta, saveSong as saveCloudSong } from "@/lib/firebase/songs";
import type { SongMeta } from "@/lib/firebase/types";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  applyTimingSettingsToSong,
  createPartOverrideFromShared,
  ensureTimingForSong,
  resetPartOverride,
} from "@/lib/timing";
import type {
  LineTiming,
  LyricSelection,
  PartKey,
  Song,
  SongMode,
  SongTimingSettings,
  TimingScope,
  VocalPart,
  VoicePreset,
} from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentScriptEditor } from "./DocumentScriptEditor";
import { EditorShell } from "./EditorShell";
import { ArrangementEditor } from "./ArrangementEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditorInspector } from "./EditorInspector";
import { ImportReviewDialog } from "./ImportReviewDialog";
import { WorkspaceSongsProvider } from "./WorkspaceSongsContext";
type SongEditorProps = {
  songId: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";

const AUTOSAVE_DEBOUNCE_MS = 700;

export function SongEditor({ songId }: SongEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, workspaceId } = useAuth();
  const [song, setSong] = useState<Song | null>(null);
  const [songMeta, setSongMeta] = useState<SongMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [lyricSelection, setLyricSelection] = useState<LyricSelection>(null);
  const [includeBass, setIncludeBass] = useState(false);
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState<string | null>(null);
  const [pendingDeleteLine, setPendingDeleteLine] = useState<{ sectionId: string; lineId: string } | null>(null);
  const [pendingLineEdit, setPendingLineEdit] = useState<{ sectionId: string; lineId: string; text: string } | null>(null);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [timingScope, setTimingScope] = useState<TimingScope>("shared");
  const hasLoaded = useRef(false);
  const editorView = searchParams.get("view") === "parts" || searchParams.get("view") === "arrangement" ? "parts" : "lyrics";

  const uid = user?.uid ?? null;
  const activeWorkspaceId = workspaceId;

  // Load the song (metadata + body) from Firestore once. State resets happen
  // via the async boundary (microtask) so the effect body never calls
  // setState synchronously.
  useEffect(() => {
    if (!uid || !activeWorkspaceId) {
      return;
    }

    let cancelled = false;
    hasLoaded.current = false;

    Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      setSong(null);
      setSongMeta(null);
      setNotFound(false);
      setLoadError(null);
      setSaveState("idle");
    });

    getSongWithMeta(activeWorkspaceId, songId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!result) {
          setNotFound(true);
          return;
        }

        // Cloud-loaded songs pass through the canonical sanitizer/migration
        // boundary before entering editor state.
        const normalizedSong = normalizeSong(result.song);
        setSong(normalizedSong);
        setSongMeta(result.meta);
        setIncludeBass(getEnabledVoiceParts(normalizedSong).includes("bass"));
        setActiveSectionId(normalizedSong.source.sections[0]?.id ?? null);
        hasLoaded.current = true;
        setSaveState("saved");
      })
      .catch((error) => {
        console.error("Could not load song", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load the song. Check your connection and try again.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, uid, songId]);

  // Debounced autosave (700ms) through the cloud repository. The in-memory
  // song is never reset on failure — the editor state is preserved and the
  // A failed save preserves the current in-memory document for the next autosave attempt.
  useEffect(() => {
    if (!song || !uid || !activeWorkspaceId || !hasLoaded.current) {
      return;
    }

    if (saveState !== "dirty") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveState("saving");
      saveCloudSong(activeWorkspaceId, song, uid, songMeta, {
        uid,
        displayName: user?.displayName ?? "",
        photoURL: user?.photoURL ?? undefined,
      })
        .then((meta) => {
          setSongMeta(meta);
          // Only show "Saved" if nothing was edited while saving.
          setSaveState((current) => (current === "saving" ? "saved" : current));
        })
        .catch((error) => {
          console.error("Cloud save failed", error);
          // Keep the editor content; surface explicit failure state.
          setSaveState((current) => (current === "saving" ? "failed" : current));
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [song, saveState, activeWorkspaceId, uid, songMeta, user?.displayName, user?.photoURL]);

  useEffect(() => {
    if (editorView !== "parts" || !song || !hasLoaded.current) return;
    const timeoutId = window.setTimeout(() => {
      const prepared = preparePendingSyllabification(song);
      if (!prepared.changed) return;
      setSong({ ...prepared.song, updatedAt: new Date().toISOString() });
      setSaveState("dirty");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [editorView, song]);

  function updateSong(updater: (current: Song) => Song) {
    setSong((current) => {
      if (!current) {
        return current;
      }

      return {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
    });
    setSaveState("dirty");
  }

  function handleMetadataChange(patch: Partial<Song>) {
    updateSong((current) => ({ ...current, ...patch }));
  }

  function handleModeChange(mode: SongMode) {
    setSong((current) => {
      if (!current) return current;
      const prepared = mode === "advanced" ? preparePendingSyllabification(current).song : current;
      return mode === "advanced" ? ensureTimingForSong({ ...prepared, mode }) : { ...prepared, mode };
    });
  }

  function handleTimingSettingsChange(settings: SongTimingSettings) {
    updateSong((current) => applyTimingSettingsToSong(ensureTimingForSong(current), settings));
  }

  function handleLineTimingChange(lineId: string, lineTiming: LineTiming) {
    updateSong((current) => ({
      ...current,
      timingByLine: {
        ...current.timingByLine,
        [lineId]: lineTiming,
      },
    }));
  }

  function handleCreateTimingOverride(part: VocalPart) {
    updateSong((current) => {
      const songWithTiming = ensureTimingForSong(current);

      return {
        ...songWithTiming,
        timingByLine: Object.fromEntries(
          Object.entries(songWithTiming.timingByLine).map(([lineId, lineTiming]) => [
            lineId,
            createPartOverrideFromShared(lineTiming, part),
          ]),
        ),
      };
    });
  }

  function handleResetTimingOverride(part: VocalPart) {
    updateSong((current) => ({
      ...current,
      timingByLine: Object.fromEntries(
        Object.entries(current.timingByLine).map(([lineId, lineTiming]) => [
          lineId,
          resetPartOverride(lineTiming, part),
        ]),
      ),
    }));
  }

  function handleRenameSection(sectionId: string, name: string) {
    updateSong((current) => ({
      ...current,
      source: {
        sections: current.source.sections.map((section) =>
          section.id === sectionId ? { ...section, name } : section,
        ),
      },
    }));
  }

  function handleDeleteSection(sectionId: string) {
    if (!song) {
      return;
    }

    const section = song.source.sections.find((candidate) => candidate.id === sectionId);
    if (!section) {
      return;
    }

    setPendingDeleteSectionId(section.id);
  }

  function confirmDeleteSection() {
    if (!song || !pendingDeleteSectionId) return;
    const remainingSectionId = song.source.sections.find((candidate) => candidate.id !== pendingDeleteSectionId)?.id ?? null;
    updateSong((current) => deleteSourceSectionWithOccurrences(current, pendingDeleteSectionId));
    setActiveSectionId((current) => (current === pendingDeleteSectionId ? remainingSectionId : current));
    setFocusedSectionId(null);
    setPendingDeleteSectionId(null);
  }

  function lineHasMeaningfulData(lineId: string) {
    const line = song?.source.sections.flatMap((section) => section.lines).find((candidate) => candidate.id === lineId);
    if (!line) return false;
    const hasSyllableData = line.words.some((word) => word.syllables.some((syllable) => Boolean(syllable.soprano || syllable.alto || syllable.tenor || syllable.bass || syllable.directorNote || syllable.techniques.length)));
    const timing = song?.timingByLine[lineId];
    return hasSyllableData || line.annotations.length > 0 || Boolean(timing && (timing.sharedEvents.length > 0 || Object.values(timing.partOverrides).some((events) => Boolean(events?.length))));
  }

  function deleteLineAndOfferUndo(sectionId: string, lineId: string) {
    const currentSection = song?.source.sections.find((section) => section.id === sectionId);
    const lineIndex = currentSection?.lines.findIndex((line) => line.id === lineId) ?? -1;
    const deletedLine = currentSection?.lines[lineIndex];
    const deletedTiming = song?.timingByLine[lineId];
    if (!deletedLine || lineIndex < 0) return null;
    updateSong((current) => deleteLine(current, sectionId, lineId));
    toast("Line deleted", { action: { label: "Undo", onClick: () => updateSong((current) => ({ ...current, source: { sections: current.source.sections.map((section) => section.id !== sectionId ? section : { ...section, lines: [...section.lines.slice(0, lineIndex), deletedLine, ...section.lines.slice(lineIndex)] }) }, timingByLine: deletedTiming ? { ...current.timingByLine, [lineId]: deletedTiming } : current.timingByLine })) } });
    return currentSection.lines[lineIndex - 1]?.id ?? null;
  }

  function confirmDeleteLine() {
    if (!pendingDeleteLine) return;
    deleteLineAndOfferUndo(pendingDeleteLine.sectionId, pendingDeleteLine.lineId);
    setPendingDeleteLine(null);
  }

  function handleAddOccurrence(sourceSectionId: string) {
    updateSong((current) => appendOccurrence(current, sourceSectionId));
  }

  function handleRemoveOccurrence(occurrenceId: string) {
    updateSong((current) => removeOccurrence(current, occurrenceId));
  }

  function handleMoveOccurrence(occurrenceId: string, direction: "up" | "down") {
    updateSong((current) => moveOccurrence(current, occurrenceId, direction));
  }

  function handleReorderOccurrence(occurrenceId: string, overOccurrenceId: string) {
    updateSong((current) => reorderOccurrence(current, occurrenceId, overOccurrenceId));
  }

  function handleSetOccurrenceRepeatCount(occurrenceId: string, repeatCount: number) {
    updateSong((current) => setOccurrenceRepeatCount(current, occurrenceId, repeatCount));
  }

  function handleSetOccurrenceNote(occurrenceId: string, note: string) {
    updateSong((current) => setOccurrenceNote(current, occurrenceId, note));
  }

  function handleEditSource(sourceSectionId: string) {
    setActiveSectionId(sourceSectionId);
    setFocusedSectionId(sourceSectionId);
    router.push(`/songs/${songId}?view=lyrics#source-${sourceSectionId}`);
  }

  function handleCreateSectionAfter(sectionId: string | null, name = "New Section") {
    const section = createEmptySection(name);

    updateSong((current) => {
      const insertSections = (sections: typeof current.source.sections) => {
        if (!sectionId) {
          return [...sections, section];
        }

        const sectionIndex = sections.findIndex((item) => item.id === sectionId);

        if (sectionIndex === -1) {
          return [...sections, section];
        }

        return [
          ...sections.slice(0, sectionIndex + 1),
          section,
          ...sections.slice(sectionIndex + 1),
        ];
      };

      // Phase 3: a newly created Source section also enters the active
      // arrangement (architecture §H) — preserving the old behavior where
      // new content appeared in the script.
      const sectionWithOccurrence = {
        ...current,
        source: { sections: insertSections(current.source.sections) },
        arrangements: current.arrangements.map((arrangement) =>
          arrangement.id === current.activeArrangementId
            ? {
                ...arrangement,
                occurrences: [
                  ...arrangement.occurrences,
                  { id: createId("occ"), sourceSectionId: section.id, repeatCount: 1 },
                ],
              }
            : arrangement,
        ),
      };

      return sectionWithOccurrence;
    });
    setActiveSectionId(section.id);
    setFocusedSectionId(section.id);
  }

  function handleAddLine(sectionId: string, lyricLine: string) {
    if (!sectionId) {
      handleGenerateScript(lyricLine);
      return;
    }
    const parsed = parseLyricsInput(lyricLine);
    if (parsed.sections.length === 0) return;
    if (parsed.sections.length > 1 || parsed.sections.some((section) => section.heading)) {
      handleGenerateScript(lyricLine);
      return;
    }
    const syllabification = editorView === "parts" ? "auto" : "pending";
    const lines = parsed.sections[0].lines.map((line) => createLineFromText(line, syllabification));

    updateSong((current) => {
      const nextSong = {
        ...current,
        source: {
          sections: current.source.sections.map((section) =>
            section.id === sectionId
              ? { ...section, lines: [...section.lines, ...lines] }
              : section,
          ),
        },
      };

      return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
    });
    setActiveSectionId(sectionId);
  }

  function handleGenerateScript(lyrics: string) {
    const parsed = parseLyricsInput(lyrics);
    if (parsed.sections.length === 0) {
      return;
    }

    const hasHeadings = parsed.sections.length > 1 || parsed.sections.some((section) => section.heading);
    if (hasHeadings) {
      const newSections = parsed.sections.map((parsedSection, index) => {
        const section = createEmptySection(parsedSection.heading ?? `Section ${index + 1}`);
        section.lines = parsedSection.lines.map((line) => createLineFromText(line, editorView === "parts" ? "auto" : "pending"));
        return section;
      });
      updateSong((current) => {
        const afterId = activeSectionId;
        const afterIndex = afterId ? current.source.sections.findIndex((section) => section.id === afterId) : -1;
        const sourceSections = [...current.source.sections];
        sourceSections.splice(afterIndex + 1, 0, ...newSections);
        return {
          ...current,
          source: { sections: sourceSections },
          arrangements: current.arrangements.map((arrangement) => arrangement.id === current.activeArrangementId ? { ...arrangement, occurrences: [...arrangement.occurrences, ...newSections.map((section) => ({ id: createId("occ"), sourceSectionId: section.id, repeatCount: 1 }))] } : arrangement),
        };
      });
      setActiveSectionId(newSections[0].id);
      return;
    }

    const lines = parsed.sections[0].lines.map((line) => createLineFromText(line, editorView === "parts" ? "auto" : "pending"));

    updateSong((current) => {
      if (current.source.sections.length === 0) {
        const section = createEmptySection("Verse 1");
        section.lines = lines;
        setActiveSectionId(section.id);
        const arrangement = createDefaultArrangement([section]);
        const nextSong: Song = {
          ...current,
          source: { sections: [section] },
          arrangements: [arrangement],
          activeArrangementId: arrangement.id,
        };
        return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
      }

      const targetSectionId = activeSectionId ?? current.source.sections[0].id;

      const nextSong = {
        ...current,
        source: {
          sections: current.source.sections.map((section) =>
            section.id === targetSectionId
              ? { ...section, lines: [...section.lines, ...lines] }
              : section,
          ),
        },
      };

      return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
    });
  }

  function handleReviewImport(lyrics: string) {
    if (lyrics.trim()) setPendingImportText(lyrics);
  }

  function handleApplyImport(lyrics: string, mode: "replace" | "append") {
    const parsed = parseLyricsInput(lyrics);
    if (parsed.sections.length === 0) return;

    const importedSections = parsed.sections.map((parsedSection, index) => {
      const section = createEmptySection(parsedSection.heading ?? `Imported section ${index + 1}`);
      section.lines = parsedSection.lines.map((line) => createLineFromText(line, "pending"));
      return section;
    });

    updateSong((current) => {
      const activeArrangement = current.arrangements.find((arrangement) => arrangement.id === current.activeArrangementId) ?? current.arrangements[0];
      const importedOccurrences = importedSections.map((section) => ({ id: createId("occ"), sourceSectionId: section.id, repeatCount: 1 }));
      const sourceSections = mode === "replace" ? importedSections : [...current.source.sections, ...importedSections];
      const arrangements = current.arrangements.map((arrangement) => arrangement.id === activeArrangement?.id
        ? { ...arrangement, occurrences: mode === "replace" ? importedOccurrences : [...arrangement.occurrences, ...importedOccurrences] }
        : arrangement);
      const nextSong = { ...current, source: { sections: sourceSections }, arrangements };
      return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
    });
    setActiveSectionId(importedSections[0].id);
    setPendingImportText(null);
  }

  function handleDuplicateLine(sectionId: string, lineId: string) {
    updateSong((current) => duplicateLine(current, sectionId, lineId));
  }

  function lineHasMusicalData(line: Song["source"]["sections"][number]["lines"][number]) {
    return line.annotations.length > 0 || line.words.some((word) => word.syllables.some((syllable) => Boolean(syllable.soprano || syllable.alto || syllable.tenor || syllable.bass || syllable.directorNote || syllable.techniques.length)));
  }

  function applyLineTextEdit(sectionId: string, lineId: string, text: string) {
    updateSong((current) => {
      let nextTiming = current.timingByLine;
      const sections = current.source.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          lines: section.lines.map((line) => {
            if (line.id !== lineId) return line;
            const nextLine = reconcileLineText(line, text);
            if (current.timingByLine[lineId]) {
              nextTiming = { ...nextTiming, [lineId]: reconcileLineTiming(current.timingByLine[lineId], nextLine) };
            }
            return nextLine;
          }),
        };
      });
      return { ...current, source: { sections }, timingByLine: nextTiming };
    });
  }

  function handleUpdateLineText(sectionId: string, lineId: string, text: string) {
    const currentSong = song;
    const line = currentSong?.source.sections.find((section) => section.id === sectionId)?.lines.find((candidate) => candidate.id === lineId);
    if (!line) return;
    const nextLine = reconcileLineText(line, text);
    const removedMusicalWord = line.words.some((word) => lineHasMusicalData({ ...line, words: [word] }) && !nextLine.words.some((candidate) => candidate.id === word.id));
    const nextTiming = currentSong?.timingByLine[lineId] ? reconcileLineTiming(currentSong.timingByLine[lineId], nextLine) : undefined;
    const removedTiming = Boolean(currentSong?.timingByLine[lineId] && nextTiming && nextTiming.sharedEvents.length < currentSong.timingByLine[lineId].sharedEvents.length);
    if (removedMusicalWord || removedTiming || (line.annotations.length > nextLine.annotations.length && lineHasMusicalData(line))) {
      setPendingLineEdit({ sectionId, lineId, text });
      return;
    }
    applyLineTextEdit(sectionId, lineId, text);
  }

  function handleInsertLyrics(_sectionId: string, _lineId: string, text: string) {
    handleReviewImport(text);
  }

  function handleCreateLineAfter(sectionId: string, lineId: string) {
    const newLine = createLineFromText("");
    updateSong((current) => ({
      ...current,
      source: { sections: current.source.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.lines.findIndex((line) => line.id === lineId);
        return index < 0 ? section : { ...section, lines: [...section.lines.slice(0, index + 1), newLine, ...section.lines.slice(index + 1)] };
      }) },
    }));
    return newLine.id;
  }

  function handleDeleteLine(sectionId: string, lineId: string) {
    const section = song?.source.sections.find((candidate) => candidate.id === sectionId);
    const index = section?.lines.findIndex((line) => line.id === lineId) ?? -1;
    const focusId = section && index > 0 ? section.lines[index - 1].id : null;
    if (lineHasMeaningfulData(lineId)) {
      setPendingDeleteLine({ sectionId, lineId });
      return null;
    }
    deleteLineAndOfferUndo(sectionId, lineId);
    return focusId;
  }

  function handleVoiceSettingsChange(preset: VoicePreset, parts: VocalPart[]) {
    setIncludeBass(parts.includes("bass"));
    updateSong((current) => ({
      ...current,
      voicePreset: preset,
      enabledParts: parts,
      bassEnabled: parts.includes("bass"),
    }));
  }

  function handleApplyTechnique(techniqueId: string) {
    if (!lyricSelection) {
      return;
    }

    updateSong((current) => applyTechniqueToSyllables(current, lyricSelection, techniqueId));
  }

  function handleRemoveTechnique(lineId: string, syllableIds: string[], techniqueId: string) {
    updateSong((current) =>
      removeTechniqueFromSyllableIds(current, lineId, syllableIds, techniqueId),
    );
  }

  function handleUpdateWordSyllables(
    sectionId: string,
    lineId: string,
    wordId: string,
    syllables: string[],
  ) {
    updateSong((current) => ({
      ...current,
      source: {
        sections: current.source.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                lines: section.lines.map((line) =>
                  line.id === lineId
                    ? (() => {
                        const words = line.words.map((word) =>
                          word.id === wordId
                          ? {
                                ...word,
                                syllabification: "manual" as const,
                                syllables: syllables.map((text, index) => {
                                  const existing = word.syllables[index];
                                  return existing
                                    ? { ...existing, text }
                                    : createSyllableToken(text);
                                }),
                              }
                            : word,
                        );
                        const validSyllableIds = new Set(
                          words.flatMap((word) => word.syllables.map((syllable) => syllable.id)),
                        );

                        return {
                          ...line,
                          words,
                          annotations: line.annotations
                            .map((annotation) => ({
                              ...annotation,
                              syllableIds: annotation.syllableIds.filter((id) =>
                                validSyllableIds.has(id),
                              ),
                            }))
                            .filter((annotation) => annotation.syllableIds.length > 0),
                        };
                      })()
                    : line,
                ),
              }
            : section,
        ),
      },
    }));
  }

  function handleRestoreWordSyllables(sectionId: string, lineId: string, wordId: string) {
    updateSong((current) => ({
      ...current,
      source: { sections: current.source.sections.map((section) => section.id !== sectionId ? section : { ...section, lines: section.lines.map((line) => line.id !== lineId ? line : { ...line, words: line.words.map((word) => word.id !== wordId ? word : { ...word, syllabification: "auto" as const, syllables: splitWordIntoSyllables(word.originalWord).map((text, index) => word.syllables[index] ? { ...word.syllables[index], text } : createSyllableToken(text)) }) }) }) },
    }));
  }

  function handlePartCueChange(
    sectionId: string,
    lineId: string,
    syllableId: string,
    part: PartKey,
    value: string,
  ) {
    updateSong((current) => ({
      ...current,
      source: {
        sections: current.source.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                lines: section.lines.map((line) =>
                  line.id === lineId
                    ? {
                        ...line,
                        words: line.words.map((word) => ({
                          ...word,
                          syllables: word.syllables.map((syllable) =>
                            syllable.id === syllableId
                              ? {
                                  ...syllable,
                                  [part]: part === "bass" && value.trim() === "" ? undefined : value,
                                }
                              : syllable,
                          ),
                        })),
                      }
                    : line,
                ),
              }
            : section,
        ),
      },
    }));
  }

  function hasTimingOverride(part: VocalPart) {
    return Boolean(
      song &&
        Object.values(song.timingByLine).some((lineTiming) => lineTiming.partOverrides[part]),
    );
  }

  const saveStatus =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "dirty"
          ? "Unsaved"
          : saveState === "failed"
            ? "Save failed"
            : "Loading";

  // Editor pages live outside the (workspace) route group (focused-editor
  // layout), so AppShell is wrapped in the songs provider inline below.
  const shell = (content: ReactNode) => (
    <WorkspaceSongsProvider>
      <EditorShell
        song={song}
        saveStatus={saveStatus}
        activeView={editorView}
      >
        {content}
      </EditorShell>
    </WorkspaceSongsProvider>
  );

  if (notFound) {
    return shell(
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle>Song not found</CardTitle>
            <CardDescription>
              This song may have been deleted from your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/songs" />}>Return to songs</Button>
          </CardContent>
        </Card>
      </div>,
    );
  }

  if (loadError) {
    return shell(
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle>Couldn&apos;t load this song</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/songs" />} variant="outline">
              Return to songs
            </Button>
          </CardContent>
        </Card>
      </div>,
    );
  }

  if (!song) {
    return shell(
      <main className="grid min-h-[calc(100svh-3.5rem)] place-items-center text-muted-foreground">
        Loading editor...
      </main>,
    );
  }

  return shell(
    <div>
      <div className={editorView === "parts" ? `mx-auto grid max-w-[1500px] gap-6 px-3 pb-10 sm:px-5 ${isInspectorCollapsed ? "xl:grid-cols-[3rem_minmax(0,1fr)_19rem]" : "xl:grid-cols-[15rem_minmax(0,1fr)_19rem]"} lg:px-8` : `mx-auto grid max-w-[1280px] gap-6 px-3 pb-10 sm:px-5 ${isInspectorCollapsed ? "xl:grid-cols-[3rem_minmax(0,1fr)]" : "xl:grid-cols-[15rem_minmax(0,1fr)]"} lg:px-8`}>
      <EditorInspector
        song={song}
        view={editorView}
        onMetadataChange={handleMetadataChange}
        onReviewImport={handleReviewImport}
        onModeChange={handleModeChange}
        enabledParts={getEnabledVoiceParts(song)}
        onVoiceSettingsChange={handleVoiceSettingsChange}
        collapsed={isInspectorCollapsed}
        onCollapsedChange={setIsInspectorCollapsed}
      />
      {editorView === "parts" ? <ArrangementEditor
          song={song}
          onAddOccurrence={handleAddOccurrence}
          onRemoveOccurrence={handleRemoveOccurrence}
          onMoveOccurrence={handleMoveOccurrence}
          onReorderOccurrence={handleReorderOccurrence}
          onSetOccurrenceNote={handleSetOccurrenceNote}
          onSetOccurrenceRepeatCount={handleSetOccurrenceRepeatCount}
          onEditSource={handleEditSource}
        /> : null}
      <DocumentScriptEditor
      song={song}
      view={editorView}
      includeBass={includeBass}
      enabledParts={getEnabledVoiceParts(song)}
      selection={lyricSelection}
      focusedSectionId={focusedSectionId}
      onSectionFocusHandled={() => setFocusedSectionId(null)}
      onMetadataChange={handleMetadataChange}
      onRenameSection={handleRenameSection}
      onDeleteSection={handleDeleteSection}
      onCreateSectionAfter={handleCreateSectionAfter}
      onAddLine={handleAddLine}
      timingScope={timingScope}
      onTimingScopeChange={setTimingScope}
      onTimingSettingsChange={handleTimingSettingsChange}
      onLineTimingChange={handleLineTimingChange}
      hasTimingOverride={hasTimingOverride}
      onCreateTimingOverride={handleCreateTimingOverride}
      onResetTimingOverride={handleResetTimingOverride}
      onSelectionChange={(nextSelection) => {
        setLyricSelection(nextSelection);
        setActiveSectionId(nextSelection.sectionId);
      }}
      onClearSelection={() => setLyricSelection(null)}
      onApplyTechnique={handleApplyTechnique}
      onRemoveTechnique={handleRemoveTechnique}
      onUpdateWordSyllables={handleUpdateWordSyllables}
      onRestoreWordSyllables={handleRestoreWordSyllables}
      onPartCueChange={handlePartCueChange}
      onDuplicateLine={handleDuplicateLine}
      onUpdateLineText={handleUpdateLineText}
      onInsertLyrics={handleInsertLyrics}
      onCreateLineAfter={handleCreateLineAfter}
      onDeleteLine={handleDeleteLine}
      />
      </div>
      {(() => {
        const pendingSection = pendingDeleteSectionId ? song.source.sections.find((section) => section.id === pendingDeleteSectionId) : null;
        const usageCount = pendingSection ? countOccurrencesForSection(song, pendingSection.id) : 0;
        return <ConfirmDialog
          open={Boolean(pendingSection)}
          onOpenChange={(open) => { if (!open) setPendingDeleteSectionId(null); }}
          title={`Delete ${pendingSection?.name ?? "section"}?`}
          description={pendingSection && usageCount > 0 ? `${pendingSection.name} is used ${usageCount} time${usageCount === 1 ? "" : "s"} in the current arrangement. Deleting this section will also remove those placements and its timing data.` : "This removes the section and its lyrics. The action cannot be undone."}
          confirmLabel="Delete section"
          destructive
          onConfirm={confirmDeleteSection}
        />;
      })()}
      <ConfirmDialog
        open={Boolean(pendingDeleteLine)}
        onOpenChange={(open) => { if (!open) setPendingDeleteLine(null); }}
        title="Delete lyric line?"
        description="This line contains vocal, technique, or timing data. Deleting it removes that data too. You can undo immediately afterward."
        confirmLabel="Delete line"
        destructive
        onConfirm={confirmDeleteLine}
      />
      <ConfirmDialog
        open={Boolean(pendingLineEdit)}
        onOpenChange={(open) => { if (!open) setPendingLineEdit(null); }}
        title="Apply lyric edit?"
        description="This edit changes words that have vocal, technique, or timing data. Unmatched data on this line will be removed, while all safely matched data stays intact."
        confirmLabel="Apply lyric edit"
        destructive
        onConfirm={() => { if (pendingLineEdit) applyLineTextEdit(pendingLineEdit.sectionId, pendingLineEdit.lineId, pendingLineEdit.text); setPendingLineEdit(null); }}
      />
      <ImportReviewDialog
        key={pendingImportText ?? "closed"}
        open={Boolean(pendingImportText)}
        text={pendingImportText ?? ""}
        onOpenChange={(open) => { if (!open) setPendingImportText(null); }}
        onApply={handleApplyImport}
      />
    </div>,
  );
}
