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
import { RawMarkupPreview } from "./RawMarkupPreview";
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
  includeBass: boolean;
  selection: LyricSelection;
  focusedSectionId: string | null;
  onSectionFocusHandled: () => void;
  onMetadataChange: (patch: Partial<Song>) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onCreateSectionAfter: (sectionId: string | null) => void;
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
    <section className="mx-auto w-full max-w-[1100px] overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-border bg-card/70 px-3 py-5 shadow-2xl shadow-background/20 sm:px-7 sm:py-7 lg:px-10">
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
            <ModeToggle mode={song.mode} onModeChange={onModeChange} />
            {song.mode === "advanced" ? (
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
                activeSectionName={song.sections[0]?.name ?? "the first section"}
                onGenerate={(lyrics) => {
                  onGenerateScript(lyrics);
                  setIsImportOpen(false);
                }}
              />
            </div>
          </details>
        </div>

        {song.mode === "advanced" ? (
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
          {song.sections.map((section) => (
            <section
              key={section.id}
              className="min-w-0 border-b border-border/70 pb-8 last:border-b-0"
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
                className="document-section-title mb-3 w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:text-foreground"
              />
              {section.lines.map((line, lineIndex) => {
                if (song.mode === "advanced") {
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
                  />
                );
              })}
              {song.mode === "advanced" ? <Separator className="my-6" /> : null}
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

        <details className="no-print mt-10 rounded-2xl border border-border bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
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
