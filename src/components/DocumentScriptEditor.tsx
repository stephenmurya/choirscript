"use client";

import { useEffect, useRef, useState } from "react";
import type { LyricSelection, PartKey, Song } from "@/lib/songTypes";
import { LyricLineBlock } from "./LyricLineBlock";
import { LyricsImporter } from "./LyricsImporter";
import { RawMarkupPreview } from "./RawMarkupPreview";
import { SlashCommandLine } from "./SlashCommandLine";
import { TechniqueContextMenu } from "./TechniqueContextMenu";

type MenuPosition = {
  x: number;
  y: number;
};

type DocumentScriptEditorProps = {
  song: Song;
  includeBass: boolean;
  selection: LyricSelection;
  focusedSectionId: string | null;
  onSectionFocusHandled: () => void;
  onMetadataChange: (patch: Partial<Song>) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onCreateSectionAfter: (sectionId: string | null) => void;
  onAddLine: (sectionId: string, lyricLine: string) => void;
  onGenerateScript: (lyrics: string) => void;
  onSelectionChange: (selection: NonNullable<LyricSelection>) => void;
  onClearSelection: () => void;
  onApplyTechnique: (techniqueId: string) => void;
  onUpdateWordSyllables: (
    sectionId: string,
    lineId: string,
    wordId: string,
    syllables: string[],
  ) => void;
  onPartCueChange: (
    sectionId: string,
    lineId: string,
    syllableId: string,
    part: PartKey,
    value: string,
  ) => void;
};

function metadataLine(song: Song) {
  return [
    song.artist ? `Singer: ${song.artist}` : "Singer",
    song.key ? `Key: ${song.key}` : "Key",
    song.tempo ? `BPM: ${song.tempo}` : "BPM",
  ].join(", ");
}

export function DocumentScriptEditor({
  song,
  includeBass,
  selection,
  focusedSectionId,
  onSectionFocusHandled,
  onMetadataChange,
  onRenameSection,
  onCreateSectionAfter,
  onAddLine,
  onGenerateScript,
  onSelectionChange,
  onClearSelection,
  onApplyTechnique,
  onUpdateWordSyllables,
  onPartCueChange,
}: DocumentScriptEditorProps) {
  const [techniqueMenuPosition, setTechniqueMenuPosition] = useState<MenuPosition | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const sectionTitleRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusedSectionId) {
      return;
    }

    const input = sectionTitleRefs.current.get(focusedSectionId);

    if (input) {
      input.focus();
      input.select();
      onSectionFocusHandled();
    }
  }, [focusedSectionId, onSectionFocusHandled]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (techniqueMenuPosition) {
        setTechniqueMenuPosition(null);
        return;
      }

      if (selection) {
        onClearSelection();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClearSelection, selection, techniqueMenuPosition]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      const isInsideTechniqueMenu = Boolean(target.closest('[data-technique-menu="true"]'));
      const isLyricToken = Boolean(target.closest('[data-lyric-token="true"]'));

      if (techniqueMenuPosition && !isInsideTechniqueMenu) {
        setTechniqueMenuPosition(null);
        return;
      }

      if (selection && !isLyricToken && !isInsideTechniqueMenu) {
        onClearSelection();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClearSelection, selection, techniqueMenuPosition]);

  return (
    <section className="mx-auto w-full max-w-[900px] overflow-x-hidden px-2 py-5 sm:px-5 sm:py-10">
      <div className="w-full rounded-xl bg-slate-50/70 px-3 py-5 shadow-sm ring-1 ring-slate-200/70 sm:rounded-2xl sm:px-8 sm:py-8 lg:px-12">
        <div className="mb-8 sm:mb-10">
          <input
            aria-label="Song title"
            value={song.title}
            onBlur={(event) => {
              if (!event.target.value.trim()) {
                onMetadataChange({ title: "Untitled Song" });
              }
            }}
            onChange={(event) => onMetadataChange({ title: event.target.value })}
            className="document-title-input w-full min-w-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
          />
          <div className="mt-2 text-sm text-slate-500">{metadataLine(song)}</div>
          <details
            open={isImportOpen}
            onToggle={(event) => setIsImportOpen(event.currentTarget.open)}
            className="no-print mt-5 max-w-full rounded-xl border border-slate-200 bg-white/80 p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-600">
              Import lyrics or edit metadata
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-600">
                Singer / Artist
                <input
                  value={song.artist ?? ""}
                  onChange={(event) => onMetadataChange({ artist: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Key
                <input
                  value={song.key ?? ""}
                  onChange={(event) => onMetadataChange({ key: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                BPM
                <input
                  value={song.tempo ?? ""}
                  onChange={(event) => onMetadataChange({ tempo: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-600">
              Director notes
              <textarea
                value={song.notes ?? ""}
                onChange={(event) => onMetadataChange({ notes: event.target.value })}
                rows={3}
                className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <div className="mt-4">
              <LyricsImporter
                activeSectionName={song.sections[0]?.name ?? "the first section"}
                onGenerate={(lyrics) => {
                  onGenerateScript(lyrics);
                  setIsImportOpen(false);
                }}
              />
            </div>
          </details>
        </div>

        <div className="space-y-8">
          {song.sections.map((section) => (
            <section
              key={section.id}
              className="min-w-0 border-b border-slate-200 pb-8 last:border-b-0"
            >
              <input
                ref={(node) => {
                  if (node) {
                    sectionTitleRefs.current.set(section.id, node);
                  } else {
                    sectionTitleRefs.current.delete(section.id);
                  }
                }}
                aria-label={`Section title ${section.name}`}
                value={section.name}
                onChange={(event) => onRenameSection(section.id, event.target.value)}
                onBlur={(event) => {
                  if (!event.target.value.trim()) {
                    onRenameSection(section.id, "New Section");
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="document-section-title mb-3 w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400 focus:text-slate-950"
              />
              {section.lines.map((line, lineIndex) => (
                <LyricLineBlock
                  key={line.id}
                  sectionId={section.id}
                  line={line}
                  lineIndex={lineIndex}
                  includeBass={includeBass}
                  selection={selection}
                  onSelectionChange={(nextSelection, menuPosition) => {
                    onSelectionChange(nextSelection);
                    if (menuPosition) {
                      setTechniqueMenuPosition(menuPosition);
                    }
                  }}
                  onUpdateWordSyllables={onUpdateWordSyllables}
                  onPartCueChange={onPartCueChange}
                />
              ))}
              <div className="ml-0 mt-5 sm:ml-9">
                <SlashCommandLine
                  onCreateLine={(lyrics) => onAddLine(section.id, lyrics)}
                  onCreateSection={() => onCreateSectionAfter(section.id)}
                />
              </div>
            </section>
          ))}

          {song.sections.length === 0 ? (
            <SlashCommandLine onCreateSection={() => onCreateSectionAfter(null)} />
          ) : null}
        </div>

        <details className="no-print mt-10 rounded-xl border border-slate-200 bg-white/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-500">
            Raw markup preview
          </summary>
          <div className="mt-3">
            <RawMarkupPreview sections={song.sections} />
          </div>
        </details>
      </div>

      <TechniqueContextMenu
        position={techniqueMenuPosition}
        onApplyTechnique={(techniqueId) => {
          onApplyTechnique(techniqueId);
          setTechniqueMenuPosition(null);
        }}
      />
    </section>
  );
}
