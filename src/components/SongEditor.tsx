"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyTechniqueToSyllables } from "@/lib/annotationUtils";
import {
  createEmptySection,
  createLineFromText,
  createSyllableToken,
  getSongById,
  saveSong,
} from "@/lib/songStorage";
import { songHasBass } from "@/lib/songSelection";
import type { LyricSelection, PartKey, Song } from "@/lib/songTypes";
import { DocumentScriptEditor } from "./DocumentScriptEditor";
import { OnboardingDialog } from "./OnboardingDialog";

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
  const [isTipsOpen, setIsTipsOpen] = useState(false);
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

    updateSong((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, lines: [...section.lines, line] }
          : section,
      ),
    }));
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
        return { ...current, sections: [section] };
      }

      const targetSectionId = activeSectionId ?? current.sections[0].id;

      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === targetSectionId
            ? { ...section, lines: [...section.lines, ...lines] }
            : section,
        ),
      };
    });
  }

  function handleApplyTechnique(techniqueId: string) {
    if (!lyricSelection) {
      return;
    }

    updateSong((current) => applyTechniqueToSyllables(current, lyricSelection, techniqueId));
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

  if (notFound) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-950">
        <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Song not found</h1>
          <p className="mt-3 text-slate-600">
            This song may have been deleted from localStorage.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-600">
        Loading editor...
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-slate-100/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[900px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <span className="text-sm font-semibold text-slate-500">ChoirScript</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {includeBass ? (
              <span className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600">
                Bass visible
              </span>
            ) : null}
            <span className="min-h-11 rounded-md bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
              {saveStatus}
            </span>
            <button
              type="button"
              onClick={() => setIsTipsOpen(true)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Show tips
            </button>
            <button
              type="button"
              onClick={handleSaveNow}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Save
            </button>
            <Link
              href={`/songs/${song.id}/rehearsal`}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Preview
            </Link>
            <Link
              href={`/songs/${song.id}/rehearsal`}
              className="min-h-11 rounded-md bg-cyan-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Print / Save PDF
            </Link>
          </div>
        </div>
      </header>

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
        onSelectionChange={(nextSelection) => {
          setLyricSelection(nextSelection);
          setActiveSectionId(nextSelection.sectionId);
        }}
        onClearSelection={() => setLyricSelection(null)}
        onApplyTechnique={handleApplyTechnique}
        onUpdateWordSyllables={handleUpdateWordSyllables}
        onPartCueChange={handlePartCueChange}
      />
      <OnboardingDialog open={isTipsOpen} onOpenChange={setIsTipsOpen} autoShow />
    </main>
  );
}
