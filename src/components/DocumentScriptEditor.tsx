"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LineTiming,
  LyricSelection,
  PartKey,
  Song,
  SongLine,
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { AdvancedTimingLine } from "./AdvancedTimingLine";
import { LyricLineBlock } from "./LyricLineBlock";
import { PartTransferMenu } from "./PartTransferMenu";
import type { PartTransferMode } from "@/lib/partTransfer";
import { PlainLyricsEditor } from "./PlainLyricsEditor";
import { SlashCommandLine } from "./SlashCommandLine";
import { TechniqueContextMenu } from "./TechniqueContextMenu";
import { TimingScopeSelector } from "./TimingScopeSelector";
import { TimingSettingsPopover } from "./TimingSettingsPopover";

type MenuPosition = {
  x: number;
  y: number;
};

function timingLineText(line: SongLine) {
  return line.words.map((word) => word.originalWord).join(" ");
}

function TimingLineSummary({ line, lineTiming, onEdit, onDuplicate, onDelete }: { line: SongLine; lineTiming: LineTiming; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const eventCount = lineTiming.sharedEvents.length + Object.values(lineTiming.partOverrides).reduce((count, events) => count + (events?.length ?? 0), 0);
  return <article className="group/timing flex items-center gap-3 border-b border-border/70 py-3">
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{timingLineText(line) || "Empty lyric line"}</p><p className="mt-1 text-xs text-muted-foreground">{lineTiming.bars.length} bar{lineTiming.bars.length === 1 ? "" : "s"} · {eventCount} timing event{eventCount === 1 ? "" : "s"}</p></div>
    <div className="no-print flex shrink-0 items-center gap-1 opacity-70 transition sm:opacity-0 sm:group-hover/timing:opacity-100 sm:group-focus-within/timing:opacity-100"><Button type="button" variant="outline" size="sm" onClick={onEdit}><Pencil />Edit timing</Button><Button type="button" variant="ghost" size="icon-xs" onClick={onDuplicate} aria-label="Duplicate line"><Copy /></Button><Button type="button" variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={onDelete} aria-label="Delete line"><Trash2 /></Button></div>
  </article>;
}

type DocumentScriptEditorProps = {
  song: Song;
  view: "lyrics" | "parts";
  includeBass: boolean;
  enabledParts: PartKey[];
  selection: LyricSelection;
  focusedSectionId: string | null;
  onSectionFocusHandled: () => void;
  onMetadataChange: (patch: Partial<Song>) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreateSectionAfter: (sectionId: string | null, name?: string) => void;
  onAddLine: (sectionId: string, lyricLine: string) => void;
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
  onRestoreWordSyllables: (sectionId: string, lineId: string, wordId: string) => void;
  onPartCueChange: (
    sectionId: string,
    lineId: string,
    syllableId: string,
    part: PartKey,
    value: string,
  ) => void;
  onDuplicateLine: (sectionId: string, lineId: string) => void;
  onTransferLinePart: (
    sectionId: string,
    lineId: string,
    from: VocalPart,
    to: VocalPart,
    mode: PartTransferMode,
  ) => void;
  onTransferSectionPart: (
    sectionId: string,
    from: VocalPart,
    to: VocalPart,
    mode: PartTransferMode,
  ) => void;
  onUpdateLineText: (sectionId: string, lineId: string, text: string) => void;
  onInsertLyrics: (sectionId: string, lineId: string, text: string) => void;
  onCreateLineAfter: (sectionId: string, lineId: string) => string;
  onDeleteLine: (sectionId: string, lineId: string) => string | null;
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
  enabledParts,
  selection,
  focusedSectionId,
  onSectionFocusHandled,
  onMetadataChange,
  onRenameSection,
  onDeleteSection,
  onCreateSectionAfter,
  onAddLine,
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
  onRestoreWordSyllables,
  onPartCueChange,
  onDuplicateLine,
  onTransferLinePart,
  onTransferSectionPart,
  onUpdateLineText,
  onInsertLyrics,
  onCreateLineAfter,
  onDeleteLine,
}: DocumentScriptEditorProps) {
  const [techniqueMenuPosition, setTechniqueMenuPosition] = useState<MenuPosition | null>(null);
  const [focusedTimingLineId, setFocusedTimingLineId] = useState<string | null>(null);
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

      if (selection && !isLyricToken && !isInsideTechniqueMenu) onClearSelection();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClearSelection, selection, techniqueMenuPosition]);

  if (view === "lyrics") {
    return <PlainLyricsEditor
      song={song}
      focusedSectionId={focusedSectionId}
      onSectionFocusHandled={onSectionFocusHandled}
      onRenameSection={onRenameSection}
      onDeleteSection={onDeleteSection}
      onCreateSectionAfter={onCreateSectionAfter}
      onAddLine={onAddLine}
      onUpdateLineText={onUpdateLineText}
      onInsertLyrics={onInsertLyrics}
      onCreateLineAfter={onCreateLineAfter}
      onDeleteLine={onDeleteLine}
      onDuplicateLine={onDuplicateLine}
    />;
  }

  return (
    <section className="order-2 mx-auto w-full max-w-[1100px] overflow-x-clip px-3 py-5 sm:px-6 sm:py-8 xl:order-1 lg:px-8">
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
                <PartTransferMenu
                  scope="section"
                  enabledParts={enabledParts}
                  onTransfer={(from, to, mode) => onTransferSectionPart(section.id, from, to, mode)}
                />
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  className="no-print shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                >
                  Delete section
                </button>
              </div>
              {section.lines.map((line, lineIndex) => {
                if (view === "parts" && song.mode === "advanced") {
                  const lineTiming = song.timingByLine[line.id];

                  return lineTiming ? focusedTimingLineId === line.id ? (
                    <div key={line.id}>
                      <Button type="button" variant="ghost" size="sm" className="no-print mb-2" onClick={() => setFocusedTimingLineId(null)}>Back to timing overview</Button>
                      <AdvancedTimingLine
                      key={line.id}
                      sectionId={section.id}
                      line={line}
                      lineIndex={lineIndex}
                      lineTiming={lineTiming}
                      settings={song.timingSettings}
                      includeBass={includeBass}
                      enabledParts={enabledParts}
                      timingScope={timingScope}
                      onLineTimingChange={(nextLineTiming) =>
                        onLineTimingChange(line.id, nextLineTiming)
                      }
                      onPartCueChange={onPartCueChange}
                      onRemoveTechnique={onRemoveTechnique}
                      onDuplicateLine={(lineId) => onDuplicateLine(section.id, lineId)}
                      />
                    </div>
                  ) : <TimingLineSummary key={line.id} line={line} lineTiming={lineTiming} onEdit={() => setFocusedTimingLineId(line.id)} onDuplicate={() => onDuplicateLine(section.id, line.id)} onDelete={() => onDeleteLine(section.id, line.id)} /> : null;
                }

                return (
                  <LyricLineBlock
                    key={line.id}
                    sectionId={section.id}
                    line={line}
                    lineIndex={lineIndex}
                    includeBass={includeBass}
                    enabledParts={enabledParts}
                    showParts={view === "parts"}
                    selection={selection}
                    onSelectionChange={(nextSelection, menuPosition) => {
                      onSelectionChange(nextSelection);
                      if (menuPosition) {
                        setTechniqueMenuPosition(menuPosition);
                      }
                    }}
                    onUpdateWordSyllables={onUpdateWordSyllables}
                    onRestoreWordSyllables={onRestoreWordSyllables}
                    onPartCueChange={onPartCueChange}
                    onRemoveTechnique={onRemoveTechnique}
                    onDuplicateLine={(lineId) => onDuplicateLine(section.id, lineId)}
                    onTransferLinePart={(from, to, mode) =>
                      onTransferLinePart(section.id, line.id, from, to, mode)
                    }
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
              <SlashCommandLine onCreateLine={(text) => onAddLine("", text)} onCreateSection={(name) => onCreateSectionAfter(null, name)} />
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
