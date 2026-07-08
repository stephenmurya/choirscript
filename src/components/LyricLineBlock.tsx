"use client";

import { useRef, useState } from "react";
import {
  flattenLineSyllables,
  getAnnotationsForSyllable,
  getPrimaryAnnotation,
  getSyllableRangeInLine,
  groupTechniqueRanges,
} from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import { splitManualSyllables } from "@/lib/syllableSplitter";
import type { LyricSelection, PartKey, SongLine, WordToken } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";
import { VoicePartLanes } from "./VoicePartLanes";

type MenuPosition = {
  x: number;
  y: number;
};

type LyricLineBlockProps = {
  sectionId: string;
  line: SongLine;
  lineIndex: number;
  includeBass: boolean;
  selection: LyricSelection;
  onSelectionChange: (selection: NonNullable<LyricSelection>, menuPosition?: MenuPosition) => void;
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

type EditingWord = {
  word: WordToken;
  value: string;
};

export function LyricLineBlock({
  sectionId,
  line,
  lineIndex,
  includeBass,
  selection,
  onSelectionChange,
  onUpdateWordSyllables,
  onPartCueChange,
}: LyricLineBlockProps) {
  const [editingWord, setEditingWord] = useState<EditingWord | null>(null);
  const dragStartIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const flatSyllables = flattenLineSyllables(line);
  const selectedIds =
    selection?.lineId === line.id ? new Set(selection.selectedSyllableIds) : new Set<string>();
  const techniqueRanges = groupTechniqueRanges(line);
  const lyricGridRow = techniqueRanges.length + 1;
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

  return (
    <article data-line-block="true" className="line-block group/line w-full overflow-hidden py-5">
      <div
        data-line-scroll="true"
        className="line-scroll max-w-full overflow-x-auto overscroll-x-contain pb-2"
      >
        <div className="line-grid-shell min-w-max pr-3">
          <div className="grid items-end gap-x-1.5 gap-y-1" style={gridStyle}>
            {techniqueRanges.map((range, rangeIndex) => {
              const technique = getTechniqueById(range.techniqueId);

              if (!technique) {
                return null;
              }

              return (
                <button
                  key={range.id}
                  type="button"
                  className="mb-0.5 flex w-fit max-w-full"
                  style={{
                    gridColumn: `${range.startIndex + 2} / span ${
                      range.endIndex - range.startIndex + 1
                    }`,
                    gridRow: rangeIndex + 1,
                  }}
                >
                  <TechniqueBadge technique={technique} compact />
                </button>
              );
            })}

            <div
              className="sticky left-0 z-20 bg-slate-50"
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

              return (
                <button
                  key={flat.id}
                  type="button"
                  data-lyric-token="true"
                  data-selected-lyric-token={isSelected ? "true" : "false"}
                  data-syllable-id={flat.id}
                  style={{ gridColumn: flat.absoluteIndex + 2, gridRow: lyricGridRow }}
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
                  onDoubleClick={() => {
                    setEditingWord({
                      word: flat.word,
                      value: flat.word.syllables.map((syllable) => syllable.text).join("-"),
                    });
                  }}
                  className={`min-h-8 rounded px-1 text-left text-[0.96rem] font-medium leading-8 text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:min-h-7 sm:leading-7 ${
                    technique ? technique.highlightClass : ""
                  } ${annotations.length > 1 ? "border-b-2 border-current" : ""} ${
                    isSelected ? "bg-sky-100 text-sky-950 ring-1 ring-sky-300" : ""
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
                  {!isWordEnd ? <span className="pl-0.5 text-slate-400">-</span> : null}
                </button>
              );
            })}
          </div>

          <VoicePartLanes
            line={line}
            lineIndex={lineIndex}
            syllables={flatSyllables}
            includeBass={includeBass}
            onPartCueChange={(syllableId, part, value) =>
              onPartCueChange(sectionId, line.id, syllableId, part, value)
            }
          />
        </div>
      </div>

      {editingWord ? (
        <form
          className="ml-9 mt-3 max-w-md rounded-lg border border-cyan-200 bg-cyan-50 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextSyllables = splitManualSyllables(editingWord.value);

            if (nextSyllables.length > 0) {
              onUpdateWordSyllables(sectionId, line.id, editingWord.word.id, nextSyllables);
              setEditingWord(null);
            }
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            Edit syllables for {editingWord.word.originalWord}
            <input
              value={editingWord.value}
              onChange={(event) =>
                setEditingWord((current) =>
                  current ? { ...current, value: event.target.value } : current,
                )
              }
              placeholder="faith-ful-ness"
              className="mt-1 w-full rounded-md border border-cyan-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Save syllables
            </button>
            <button
              type="button"
              onClick={() => setEditingWord(null)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
