"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedTimingLine } from "./AdvancedTimingLine";
import { LyricLineBlock } from "./LyricLineBlock";
import { LyricsImporter } from "./LyricsImporter";
import { ModeToggle } from "./ModeToggle";
import { SlashCommandLine } from "./SlashCommandLine";
import { TechniqueContextMenu } from "./TechniqueContextMenu";
import { TimingScopeSelector } from "./TimingScopeSelector";
import { TimingSettingsPopover } from "./TimingSettingsPopover";

type MenuPosition = {
  x: number;
  y: number;
};

type DocumentScriptEditorProps = {
  song: Song;
  view: "lyrics" | "parts";
  includeBass: boolean;
  onBassEnabledChange: (enabled: boolean) => void;
  selection: LyricSelection;
  focusedSectionId: string | null;
  onSectionFocusHandled: () => void;
  onMetadataChange: (patch: Partial<Song>) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreateSectionAfter: (sectionId: string | null, name?: string) => void;
  onAddLine: (sectionId: string, lyricLine: string) => void;
  onGenerateScript: (lyrics: string) => void;
  onModeChange: (mode: SongMode) => void;
  timingScope: TimingScope;
  onTimingScopeChange: (scope: TimingScope) => void;
  onTimingSettingsChange: (settings: SongTimingSettings) => void;
  onLineTimingChange: (lineId: string, lineTiming: LineTiming) => void;
  hasTimingOverride: (part: VocalPart) => boolean;
  onCreateTimingOverride: (part: VocalPart) => void;
  onResetTimingOverride: (part: VocalPart) => void;
  onSelectionChange: (selection: NonNullable<LyricSelection>) => void;
  onClearSelection: () => void;
  onApplyTechnique: (techniqueId: string) => void;
  onRemoveTechnique: (lineId: string, syllableIds: string[], techniqueId: string) => void;
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
  onDuplicateLine: (sectionId: string, lineId: string) => void;
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
  view,
  includeBass,
  onBassEnabledChange,
  selection,
  focusedSectionId,
  onSectionFocusHandled,
  onMetadataChange,
  onRenameSection,
  onDeleteSection,
  onCreateSectionAfter,
  onAddLine,
  onGenerateScript,
  onModeChange,
  timingScope,
  onTimingScopeChange,
  onTimingSettingsChange,
  onLineTimingChange,
  hasTimingOverride,
  onCreateTimingOverride,
  onResetTimingOverride,
  onSelectionChange,
  onClearSelection,
  onApplyTechnique,
  onRemoveTechnique,
  onUpdateWordSyllables,
  onPartCueChange,
  onDuplicateLine,
}: DocumentScriptEditorProps) {
  const [techniqueMenuPosition, setTechniqueMenuPosition] = useState<MenuPosition | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const sectionTitleRefs = useRef(new Map<string, HTMLInputElement>());
  const emptyStateFocusedRef = useRef(false);

  // The lyric editing surface is syllable-token based: an empty song has no
  // tokens to receive native focus. The closest REAL editable element is the
  // first section's SlashCommandLine input (the same input used to type the
  // first lyric line). Focusing it gives a genuine browser caret so users can
  // type immediately. Only runs for genuinely empty songs, only once per
  // mount — never hijacks focus for populated songs.
  const isEmptySong =
    song.source.sections.length === 0 ||
    song.source.sections.every((section) => section.lines.length === 0);

  useEffect(() => {
    if (!isEmptySong || emptyStateFocusedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>(
        '[data-empty-song-focus="true"] input',
      );

      if (firstInput) {
        firstInput.focus();
        emptyStateFocusedRef.current = true;
      }
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [isEmptySong]);

  // Clicking the empty document surface also moves focus to the editable line.
  useEffect(() => {
    if (!isEmptySong) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      const surface = target.closest('[data-empty-song-surface="true"]');

      if (!surface || target.closest("input, button, textarea, a, label")) {
        return;
      }

      const firstInput = document.querySelector<HTMLInputElement>(
        '[data-empty-song-focus="true"] input',
      );

      firstInput?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEmptySong]);

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
    <section className="mx-auto w-full max-w-[1100px] overflow-x-hidden px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="w-full">
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
            className="document-title-input w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 text-sm text-muted-foreground">{metadataLine(song)}</div>
          <div className="no-print mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {view === "parts" ? <div className="flex flex-wrap items-center gap-3"><ModeToggle mode={song.mode} onModeChange={onModeChange} /><label className="inline-flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={includeBass} onChange={(event) => onBassEnabledChange(event.target.checked)} className="accent-primary" />Bass lane</label></div> : null}
            {view === "parts" && song.mode === "advanced" ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <TimingScopeSelector
                  scope={timingScope}
                  hasOverride={hasTimingOverride}
                  onScopeChange={onTimingScopeChange}
                  onCreateOverride={onCreateTimingOverride}
                  onResetOverride={onResetTimingOverride}
                />
                <TimingSettingsPopover
                  settings={song.timingSettings}
                  onChange={onTimingSettingsChange}
                />
              </div>
            ) : null}
          </div>
          <details
            open={isImportOpen}
            onToggle={(event) => setIsImportOpen(event.currentTarget.open)}
            className="no-print mt-5 max-w-full rounded-2xl border border-border bg-muted/20 p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
              Import lyrics or edit metadata
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                Singer / Artist
                <Input
                  value={song.artist ?? ""}
                  onChange={(event) => onMetadataChange({ artist: event.target.value })}
                />
              </Label>
              <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                Key
                <Input
                  value={song.key ?? ""}
                  onChange={(event) => onMetadataChange({ key: event.target.value })}
                />
              </Label>
              <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                BPM
                <Input
                  value={song.tempo ?? ""}
                  onChange={(event) => onMetadataChange({ tempo: event.target.value })}
                />
              </Label>
            </div>
            <Label className="mt-4 flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              Director notes
              <Textarea
                value={song.notes ?? ""}
                onChange={(event) => onMetadataChange({ notes: event.target.value })}
                rows={3}
              />
            </Label>
            <div className="mt-4">
              <LyricsImporter
                activeSectionName={song.source.sections[0]?.name ?? "the first section"}
                onGenerate={(lyrics) => {
                  onGenerateScript(lyrics);
                  setIsImportOpen(false);
                }}
              />
            </div>
          </details>
        </div>

        {view === "parts" && song.mode === "advanced" ? (
          <Card className="no-print mb-8 border-border bg-muted/20">
            <CardHeader>
              <div>
                <CardTitle>Advanced timing</CardTitle>
                <CardDescription>
                  Add bars, counts, holds, rests, breaks, and optional part overrides.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Timing edits are active for the selected scope above. Simple mode keeps this data
                hidden but preserved.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-8">
          {song.source.sections.map((section) => (
            <section
              key={section.id}
              id={`source-${section.id}`}
              className="min-w-0 border-b border-border/70 pb-8 last:border-b-0"
            >
              <div className="mb-3 flex items-center gap-2">
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
                  className="document-section-title min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:text-foreground"
                />
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  className="no-print shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                >
                  Delete Source
                </button>
              </div>
              {section.lines.map((line, lineIndex) => {
                if (view === "parts" && song.mode === "advanced") {
                  const lineTiming = song.timingByLine[line.id];

                  return lineTiming ? (
                    <AdvancedTimingLine
                      key={line.id}
                      sectionId={section.id}
                      line={line}
                      lineIndex={lineIndex}
                      lineTiming={lineTiming}
                      settings={song.timingSettings}
                      includeBass={includeBass}
                      timingScope={timingScope}
                      onLineTimingChange={(nextLineTiming) =>
                        onLineTimingChange(line.id, nextLineTiming)
                      }
                      onPartCueChange={onPartCueChange}
                      onRemoveTechnique={onRemoveTechnique}
                      onDuplicateLine={(lineId) => onDuplicateLine(section.id, lineId)}
                    />
                  ) : null;
                }

                return (
                  <LyricLineBlock
                    key={line.id}
                    sectionId={section.id}
                    line={line}
                    lineIndex={lineIndex}
                    includeBass={includeBass}
                    showParts={view === "parts"}
                    selection={selection}
                    onSelectionChange={(nextSelection, menuPosition) => {
                      onSelectionChange(nextSelection);
                      if (menuPosition) {
                        setTechniqueMenuPosition(menuPosition);
                      }
                    }}
                    onUpdateWordSyllables={onUpdateWordSyllables}
                    onPartCueChange={onPartCueChange}
                    onRemoveTechnique={onRemoveTechnique}
                    onDuplicateLine={(lineId) => onDuplicateLine(section.id, lineId)}
                  />
                );
              })}
              {view === "parts" && song.mode === "advanced" ? <Separator className="my-6" /> : null}
              <div className="ml-0 mt-5 sm:ml-9">
                <SlashCommandLine
                  onCreateLine={(lyrics) => onAddLine(section.id, lyrics)}
                  onCreateSection={(name) => onCreateSectionAfter(section.id, name)}
                  onDuplicateLine={selection?.sectionId === section.id ? () => onDuplicateLine(section.id, selection.lineId) : undefined}
                />
              </div>
            </section>
          ))}

          {song.source.sections.length === 0 ? (
            <div data-empty-song-focus="true" data-empty-song-surface="true">
              <SlashCommandLine onCreateLine={onGenerateScript} onCreateSection={(name) => onCreateSectionAfter(null, name)} />
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                Type your first lyric line and press Enter, or press / for options.
              </p>
            </div>
          ) : null}
        </div>
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
