"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  arrangeTechniqueRangeRows,
  flattenLineSyllables,
  getAnnotationsForSyllable,
  getPrimaryAnnotation,
  getSyllableRangeInLine,
  groupTechniqueDisplayRanges,
} from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import {
  MIN_SPLIT_AFFORDANCE_LETTERS,
  countWordLetters,
  splitManualSyllables,
} from "@/lib/syllableSplitter";
import {
  forgetSyllables,
  getApplyEverywherePreference,
  lookupSyllables,
  rememberSyllables,
  setApplyEverywherePreference,
  subscribeApplyEverywherePreference,
} from "@/lib/syllableDictionary";
import type { LyricSelection, PartKey, SongLine, VocalPart, WordToken } from "@/lib/songTypes";
import type { PartTransferMode } from "@/lib/partTransfer";
import { PartTransferMenu } from "./PartTransferMenu";
import { TechniqueBadge } from "./TechniqueBadge";
import { VoicePartLanes } from "./VoicePartLanes";
import { Copy, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type MenuPosition = {
  x: number;
  y: number;
};

type LyricLineBlockProps = {
  sectionId: string;
  line: SongLine;
  lineIndex: number;
  includeBass: boolean;
  enabledParts?: PartKey[];
  showParts?: boolean;
  selection: LyricSelection;
  onSelectionChange: (selection: NonNullable<LyricSelection>, menuPosition?: MenuPosition) => void;
  onUpdateWordSyllables: (
    sectionId: string,
    lineId: string,
    wordId: string,
    syllables: string[],
    options?: { everywhere?: boolean },
  ) => void;
  onRestoreWordSyllables?: (sectionId: string, lineId: string, wordId: string) => void;
  onPartCueChange: (
    sectionId: string,
    lineId: string,
    syllableId: string,
    part: PartKey,
    value: string,
  ) => void;
  onRemoveTechnique: (lineId: string, syllableIds: string[], techniqueId: string) => void;
  onDuplicateLine?: (lineId: string) => void;
  onTransferLinePart?: (from: VocalPart, to: VocalPart, mode: PartTransferMode) => void;
};

type EditingWord = {
  word: WordToken;
  value: string;
};

export function LyricLineBlock({
  sectionId,
  line,
  lineIndex,
  includeBass,
  enabledParts,
  showParts = true,
  selection,
  onSelectionChange,
  onUpdateWordSyllables,
  onRestoreWordSyllables,
  onPartCueChange,
  onRemoveTechnique,
  onDuplicateLine,
  onTransferLinePart,
}: LyricLineBlockProps) {
  const [editingWord, setEditingWord] = useState<EditingWord | null>(null);
  const [splitPosition, setSplitPosition] = useState(1);
  const [hasSavedSplit, setHasSavedSplit] = useState(false);
  const applyEverywhere = useSyncExternalStore(
    subscribeApplyEverywherePreference,
    getApplyEverywherePreference,
    () => true,
  );
  const dragStartIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const flatSyllables = flattenLineSyllables(line);
  const selectedIds =
    selection?.lineId === line.id ? new Set(selection.selectedSyllableIds) : new Set<string>();
  const placedTechniqueRanges = arrangeTechniqueRangeRows(groupTechniqueDisplayRanges(line));
  const annotationRowCount = placedTechniqueRanges.reduce(
    (maxRow, range) => Math.max(maxRow, range.row + 1),
    0,
  );
  const lyricGridRow = annotationRowCount + 1;
  const voiceStartRow = lyricGridRow + 1;
  const gridStyle = {
    gridTemplateColumns: `var(--line-label-col, 2.75rem) repeat(${Math.max(
      flatSyllables.length,
      1,
    )}, minmax(var(--syllable-col-min, 2.75rem), max-content))`,
  };

  function emitSelection(endSyllableId: string, menuPosition?: MenuPosition) {
    const startSyllableId = dragStartIdRef.current ?? endSyllableId;
    const selectedSyllableIds = getSyllableRangeInLine(line, startSyllableId, endSyllableId);

    onSelectionChange(
      {
        sectionId,
        lineId: line.id,
        startSyllableId,
        endSyllableId,
        selectedSyllableIds,
      },
      menuPosition,
    );
  }

  const previewSyllables = editingWord ? splitManualSyllables(editingWord.value) : [];
  const splitLimit = editingWord
    ? Math.max(1, Array.from(editingWord.word.originalWord).length - 1)
    : 1;

  function openWordEditor(word: WordToken) {
    setEditingWord({ word, value: word.syllables.map((syllable) => syllable.text).join("-") });
    setSplitPosition(Math.max(1, Math.floor(Array.from(word.originalWord).length / 2)));
    setHasSavedSplit(Boolean(lookupSyllables(word.originalWord)));
  }

  function closeWordEditor() {
    setEditingWord(null);
  }

  function updateEditingValue(value: string) {
    setEditingWord((current) => (current ? { ...current, value } : current));
  }

  function handleApplyEverywhereChange(next: boolean) {
    setApplyEverywherePreference(next);
  }

  /**
   * Single write path for the panel: Save persists the split, records it in the
   * user dictionary, and applies it once — to this word or to every matching
   * word in the song. Nothing else mutates syllables, so Save cannot be
   * mistaken for Cancel.
   */
  function saveWordSyllables() {
    if (!editingWord || previewSyllables.length === 0) {
      return;
    }

    rememberSyllables(editingWord.word.originalWord, previewSyllables);
    onUpdateWordSyllables(sectionId, line.id, editingWord.word.id, previewSyllables, {
      everywhere: applyEverywhere,
    });
    closeWordEditor();
  }

  function mergeWordSyllables() {
    if (!editingWord) {
      return;
    }

    updateEditingValue(editingWord.word.originalWord);
  }

  function splitAtPosition() {
    if (!editingWord) {
      return;
    }

    const characters = Array.from(editingWord.word.originalWord);
    const position = Math.max(1, Math.min(characters.length - 1, splitPosition));
    updateEditingValue(
      `${characters.slice(0, position).join("")}-${characters.slice(position).join("")}`,
    );
  }

  function forgetSavedSplit() {
    if (!editingWord) {
      return;
    }

    forgetSyllables(editingWord.word.originalWord);
    setHasSavedSplit(false);
  }

  return (
    <article data-line-block="true" className="line-block group/line relative w-full overflow-hidden py-5">
      {onDuplicateLine || onTransferLinePart ? (
        <div className="no-print absolute right-0 top-3 flex items-center gap-1 opacity-0 transition group-hover/line:opacity-100 focus-within:opacity-100 focus:opacity-100">
          {onTransferLinePart ? (
            <PartTransferMenu
              scope="line"
              enabledParts={enabledParts ?? []}
              onTransfer={onTransferLinePart}
            />
          ) : null}
          {onDuplicateLine ? (
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDuplicateLine(line.id)} aria-label="Duplicate line">
              <Copy />
            </Button>
          ) : null}
        </div>
      ) : null}
      <div
        data-line-scroll="true"
        className="line-scroll max-w-full overflow-x-auto overscroll-x-contain pb-2"
      >
        <div className="line-grid-shell grid w-max min-w-0 items-end gap-x-1.5 gap-y-0.5 pr-3" style={gridStyle}>
          {placedTechniqueRanges.map((range) => {
            const technique = getTechniqueById(range.techniqueId);

            if (!technique) {
              return null;
            }

            return (
              <div
                key={range.id}
                className="-mb-px flex w-fit max-w-full justify-self-start"
                style={{
                  gridColumn: `${range.startIndex + 2} / span ${
                    range.endIndex - range.startIndex + 1
                  }`,
                  gridRow: range.row + 1,
                }}
              >
                <TechniqueBadge
                  technique={technique}
                  compact
                  removable
                  onRemove={() => onRemoveTechnique(line.id, range.syllableIds, range.techniqueId)}
                  className="technique-range-label rounded-t-[6px] rounded-b-none px-2 py-1 text-[0.72rem] shadow-sm"
                />
              </div>
            );
          })}

          <div
            className="sticky left-0 z-20 bg-card"
            style={{ gridColumn: 1, gridRow: lyricGridRow }}
          />
          {flatSyllables.map((flat) => {
            const primaryAnnotation = getPrimaryAnnotation(line, flat.id);
            const annotations = getAnnotationsForSyllable(line, flat.id);
            const technique = primaryAnnotation
              ? getTechniqueById(primaryAnnotation.techniqueId)
              : undefined;
            const isSelected = selectedIds.has(flat.id);
            const isWordEnd = flat.syllableIndex === flat.word.syllables.length - 1;

            const showSplitAffordance =
              isWordEnd && countWordLetters(flat.word.originalWord) >= MIN_SPLIT_AFFORDANCE_LETTERS;

            return (
              <span
                key={flat.id}
                className={`group/token relative flex w-max items-end justify-self-center ${
                  showSplitAffordance ? "pr-3" : ""
                }`}
                style={{ gridColumn: flat.absoluteIndex + 2, gridRow: lyricGridRow }}
              >
                <button
                  type="button"
                  data-lyric-token="true"
                  data-selected-lyric-token={isSelected ? "true" : "false"}
                  data-syllable-id={flat.id}
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }

                    event.preventDefault();
                    dragStartIdRef.current = flat.id;
                    isDraggingRef.current = true;
                    emitSelection(flat.id);
                  }}
                  onPointerEnter={() => {
                    if (isDraggingRef.current) {
                      emitSelection(flat.id);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (!isDraggingRef.current) {
                      return;
                    }

                    isDraggingRef.current = false;
                    emitSelection(flat.id, {
                      x: Math.max(8, Math.min(event.clientX + 10, window.innerWidth - 296)),
                      y: Math.max(8, Math.min(event.clientY + 12, window.innerHeight - 360)),
                    });
                  }}
                  onDoubleClick={() => openWordEditor(flat.word)}
                  className={`min-h-8 w-max min-w-[var(--syllable-col-min,2.75rem)] whitespace-nowrap rounded-[6px] border p-2 text-center text-[0.96rem] font-medium leading-none text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring ${
                    technique
                      ? `${technique.highlightClass} ${technique.borderClass} shadow-sm`
                      : "border-transparent"
                  } ${annotations.length > 1 ? "ring-1 ring-current/30" : ""} ${
                    isSelected
                      ? "border-primary/60 bg-primary/20 text-foreground ring-1 ring-primary/40"
                      : ""
                  }`}
                  title={
                    annotations.length
                      ? annotations
                          .map((annotation) => {
                            const item = getTechniqueById(annotation.techniqueId);
                            return item ? `${item.symbol} ${item.name}` : "Technique";
                          })
                          .join(", ")
                      : "Drag to select. Double-click to edit syllables."
                  }
                >
                  {flat.text}
                  {!isWordEnd ? <span className="pl-0.5 text-muted-foreground">-</span> : null}
                </button>
                {showSplitAffordance ? (
                  <button
                    type="button"
                    aria-label={`Split ${flat.word.originalWord} into syllables`}
                    title="Edit syllables"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openWordEditor(flat.word);
                    }}
                    className={`absolute right-0 top-0 z-10 grid size-3 place-items-center rounded-full border border-border bg-popover text-muted-foreground shadow-sm transition group-hover/token:pointer-events-auto group-hover/token:opacity-100 group-focus-within/token:pointer-events-auto group-focus-within/token:opacity-100 hover:bg-muted hover:text-foreground ${
                      isSelected ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <MoreHorizontal className="size-2.5" />
                  </button>
                ) : null}
              </span>
            );
          })}

          {showParts ? <VoicePartLanes
              line={line}
              lineIndex={lineIndex}
              syllables={flatSyllables}
              includeBass={includeBass}
              enabledParts={enabledParts}
              gridStartRow={voiceStartRow}
              onPartCueChange={(syllableId, part, value) =>
                onPartCueChange(sectionId, line.id, syllableId, part, value)
              }
            /> : null}
        </div>
      </div>

      {editingWord ? (
        <div className="ml-9 mt-3 max-w-md rounded-2xl border border-border bg-popover p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-popover-foreground">
              Edit syllables for <span className="font-semibold">{editingWord.word.originalWord}</span>
            </p>
            <button
              type="button"
              onClick={closeWordEditor}
              aria-label="Close syllable editor"
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <input
            value={editingWord.value}
            onChange={(event) => updateEditingValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveWordSyllables();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                closeWordEditor();
              }
            }}
            placeholder="faith-ful-ness"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {previewSyllables.length > 1
              ? `${previewSyllables.length} syllables: ${previewSyllables.join(" · ")}`
              : "Separate syllables with a hyphen, e.g. faith-ful-ness."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={mergeWordSyllables}
              className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              Merge syllables
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Split at
              <input
                type="number"
                min={1}
                max={splitLimit}
                value={splitPosition}
                onChange={(event) => setSplitPosition(Number(event.target.value))}
                className="h-7 w-14 rounded-md border border-border bg-background px-2 text-foreground"
              />
              <button
                type="button"
                onClick={splitAtPosition}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted"
              >
                Split
              </button>
            </label>
            {hasSavedSplit ? (
              <button
                type="button"
                onClick={forgetSavedSplit}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Forget saved split
              </button>
            ) : null}
            {onRestoreWordSyllables ? (
              <button
                type="button"
                onClick={() => {
                  // A true reset: drop the dictionary entry too, otherwise the
                  // word would silently return to the manual split next time.
                  forgetSyllables(editingWord.word.originalWord);
                  setHasSavedSplit(false);
                  onRestoreWordSyllables(sectionId, line.id, editingWord.word.id);
                  closeWordEditor();
                }}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Restore automatic
              </button>
            ) : null}
          </div>

          <div className="mt-3 rounded-md bg-muted/40 p-2">
            <label className="flex items-start gap-2">
              <Switch checked={applyEverywhere} onCheckedChange={handleApplyEverywhereChange} />
              <span className="text-xs leading-5 text-muted-foreground">
                Apply this split to every &ldquo;{editingWord.word.originalWord}&rdquo; in this song
              </span>
            </label>
            <p className="mt-1 pl-10 text-[0.7rem] leading-4 text-muted-foreground/80">
              Saved to your syllable dictionary and reused for new words either way.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={saveWordSyllables}
              disabled={previewSyllables.length === 0}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save syllables
            </button>
            <button
              type="button"
              onClick={closeWordEditor}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
