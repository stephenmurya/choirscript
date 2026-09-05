"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { applyTechniqueToSyllables, removeTechniqueFromSyllableIds } from "@/lib/annotationUtils";
import {
  createEmptySection,
  createLineFromText,
  createSyllableToken,
  normalizeSong,
} from "@/lib/songStorage";
import { songHasBass } from "@/lib/songSelection";
import {
  getSongWithMeta,
  saveSong as saveCloudSong,
  type WorkspaceContext,
} from "@/lib/firebase/songs";
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

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";

const AUTOSAVE_DEBOUNCE_MS = 700;

export function SongEditor({ songId }: SongEditorProps) {
  const { user, workspaceId } = useAuth();
  const [song, setSong] = useState<Song | null>(null);
  const [songMeta, setSongMeta] = useState<SongMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [lyricSelection, setLyricSelection] = useState<LyricSelection>(null);
  const [includeBass, setIncludeBass] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [timingScope, setTimingScope] = useState<TimingScope>("shared");
  const hasLoaded = useRef(false);

  const uid = user?.uid ?? null;
  const activeWorkspaceId = workspaceId;

  const workspaceContext: WorkspaceContext | null =
    uid && activeWorkspaceId ? { uid, workspaceId: activeWorkspaceId } : null;

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
        setIncludeBass(songHasBass(normalizedSong));
        setActiveSectionId(normalizedSong.sections[0]?.id ?? null);
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
  // user can retry via "Save now".
  useEffect(() => {
    if (!song || !uid || !activeWorkspaceId || !hasLoaded.current) {
      return;
    }

    if (saveState !== "dirty") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveState("saving");
      saveCloudSong(activeWorkspaceId, song, uid, songMeta)
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
  }, [song, saveState, activeWorkspaceId, uid, songMeta]);

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

  function handleSaveNow() {
    if (!song || !workspaceContext) {
      return;
    }

    setSaveState("saving");
    saveCloudSong(workspaceContext.workspaceId, song, workspaceContext.uid, songMeta)
      .then((meta) => {
        setSongMeta(meta);
        setSaveState("saved");
      })
      .catch((error) => {
        console.error("Cloud save failed", error);
        setSaveState("failed");
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save. Your edits are still here — please try again.",
        );
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

  if (notFound) {
    return (
      <AppShell activeSongId={songId} saveStatus="Not found">
        <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
          <Card className="w-full max-w-xl text-center">
            <CardHeader>
              <CardTitle>Song not found</CardTitle>
              <CardDescription>
                This song may have been deleted from your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/" />}>Return to songs</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell activeSongId={songId} saveStatus="Load failed">
        <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
          <Card className="w-full max-w-xl text-center">
            <CardHeader>
              <CardTitle>Couldn&apos;t load this song</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/" />} variant="outline">
                Return to songs
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!song) {
    return (
      <AppShell activeSongId={songId} saveStatus="Loading">
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
