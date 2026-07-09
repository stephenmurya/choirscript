"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyTechniqueToSyllables, removeTechniqueFromSyllableIds } from "@/lib/annotationUtils";
import {
  createEmptySection,
  createLineFromText,
  createSyllableToken,
  getSongById,
  saveSong,
} from "@/lib/songStorage";
import { songHasBass } from "@/lib/songSelection";
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
} from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppShell } from "./AppShell";
import { DocumentScriptEditor } from "./DocumentScriptEditor";

type SongEditorProps = {
  songId: string;
};

export function SongEditor({ songId }: SongEditorProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [lyricSelection, setLyricSelection] = useState<LyricSelection>(null);
  const [includeBass, setIncludeBass] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading");
  const [timingScope, setTimingScope] = useState<TimingScope>("shared");
  const hasLoaded = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadedSong = getSongById(songId);

      if (!loadedSong) {
        setNotFound(true);
        setSaveStatus("Not found");
        return;
      }

      setSong(loadedSong);
      setIncludeBass(songHasBass(loadedSong));
      setActiveSectionId(loadedSong.sections[0]?.id ?? null);
      hasLoaded.current = true;
      setSaveStatus("Saved");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [songId]);

  useEffect(() => {
    if (!song || !hasLoaded.current) {
      return;
    }

    setSaveStatus("Saving...");
    const timeoutId = window.setTimeout(() => {
      saveSong(song);
      setSaveStatus("Saved");
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [song]);

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
  }

  function handleMetadataChange(patch: Partial<Song>) {
    updateSong((current) => ({ ...current, ...patch }));
  }

  function handleModeChange(mode: SongMode) {
    updateSong((current) => {
      const nextSong = { ...current, mode };
      return mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
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
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, name } : section,
      ),
    }));
  }

  function handleCreateSectionAfter(sectionId: string | null) {
    const section = createEmptySection("New Section");

    updateSong((current) => {
      if (!sectionId) {
        return { ...current, sections: [...current.sections, section] };
      }

      const sectionIndex = current.sections.findIndex((item) => item.id === sectionId);

      if (sectionIndex === -1) {
        return { ...current, sections: [...current.sections, section] };
      }

      return {
        ...current,
        sections: [
          ...current.sections.slice(0, sectionIndex + 1),
          section,
          ...current.sections.slice(sectionIndex + 1),
        ],
      };
    });
    setActiveSectionId(section.id);
    setFocusedSectionId(section.id);
  }

  function handleAddLine(sectionId: string, lyricLine: string) {
    const line = createLineFromText(lyricLine);

    updateSong((current) => {
      const nextSong = {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? { ...section, lines: [...section.lines, line] }
            : section,
        ),
      };

      return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
    });
    setActiveSectionId(sectionId);
  }

  function handleGenerateScript(lyrics: string) {
    const lines = lyrics
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(createLineFromText);

    if (lines.length === 0) {
      return;
    }

    updateSong((current) => {
      if (current.sections.length === 0) {
        const section = createEmptySection("Verse 1");
        section.lines = lines;
        setActiveSectionId(section.id);
        const nextSong = { ...current, sections: [section] };
        return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
      }

      const targetSectionId = activeSectionId ?? current.sections[0].id;

      const nextSong = {
        ...current,
        sections: current.sections.map((section) =>
          section.id === targetSectionId
            ? { ...section, lines: [...section.lines, ...lines] }
            : section,
        ),
      };

      return nextSong.mode === "advanced" ? ensureTimingForSong(nextSong) : nextSong;
    });
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
      sections: current.sections.map((section) =>
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
      sections: current.sections.map((section) =>
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
    }));
  }

  function handleSaveNow() {
    if (!song) {
      return;
    }

    saveSong(song);
    setSaveStatus("Saved");
  }

  function hasTimingOverride(part: VocalPart) {
    return Boolean(
      song &&
        Object.values(song.timingByLine).some((lineTiming) => lineTiming.partOverrides[part]),
    );
  }

  if (notFound) {
    return (
      <AppShell activeSongId={songId} saveStatus={saveStatus}>
        <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
          <Card className="w-full max-w-xl text-center">
            <CardHeader>
              <CardTitle>Song not found</CardTitle>
              <CardDescription>This song may have been deleted from localStorage.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/" />}>Return to songs</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!song) {
    return (
      <AppShell activeSongId={songId} saveStatus={saveStatus}>
        <main className="grid min-h-[calc(100svh-3.5rem)] place-items-center text-muted-foreground">
          Loading editor...
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeSongId={song.id}
      currentSong={song}
      saveStatus={saveStatus}
      onSave={handleSaveNow}
    >
      <DocumentScriptEditor
        song={song}
        includeBass={includeBass}
        selection={lyricSelection}
        focusedSectionId={focusedSectionId}
        onSectionFocusHandled={() => setFocusedSectionId(null)}
        onMetadataChange={handleMetadataChange}
        onRenameSection={handleRenameSection}
        onCreateSectionAfter={handleCreateSectionAfter}
        onAddLine={handleAddLine}
        onGenerateScript={handleGenerateScript}
        onModeChange={handleModeChange}
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
        onPartCueChange={handlePartCueChange}
      />
    </AppShell>
  );
}
