"use client";

import {
  flattenLineSyllables,
  getAnnotationsForSyllable,
  getPrimaryAnnotation,
} from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SongLine } from "@/lib/songTypes";
import { InlineTechniqueBadge } from "./InlineTechniqueBadge";

type SelectableSyllableTextProps = {
  line: SongLine;
  selectedIds: Set<string>;
  selectedAnnotationId: string | null;
  showTechniqueBadges: boolean;
  onSelectSyllable: (syllableId: string, range: boolean) => void;
  onAddDragSelection: (syllableId: string) => void;
  onSelectWord: (syllableIds: string[], additive: boolean) => void;
  onSelectAnnotation: (annotationId: string) => void;
  onStartEditWord: (wordId: string) => void;
};

export function SelectableSyllableText({
  line,
  selectedIds,
  selectedAnnotationId,
  showTechniqueBadges,
  onSelectSyllable,
  onAddDragSelection,
  onSelectWord,
  onSelectAnnotation,
  onStartEditWord,
}: SelectableSyllableTextProps) {
  const flatSyllables = flattenLineSyllables(line);

  return (
    <div>
      {showTechniqueBadges && line.annotations.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {line.annotations.map((annotation) => (
            <InlineTechniqueBadge
              key={annotation.id}
              annotation={annotation}
              selected={annotation.id === selectedAnnotationId}
              onSelect={onSelectAnnotation}
            />
          ))}
        </div>
      ) : null}
      <div className="leading-[2.25]">
        {line.words.map((word, wordIndex) => {
          const wordSyllableIds = word.syllables.map((syllable) => syllable.id);

          return (
            <span key={word.id} className="group/word relative inline-flex items-baseline">
              <span className="inline-flex items-baseline">
                {word.syllables.map((syllable, syllableIndex) => {
                  const primaryAnnotation = getPrimaryAnnotation(line, syllable.id);
                  const allAnnotations = getAnnotationsForSyllable(line, syllable.id);
                  const technique = primaryAnnotation
                    ? getTechniqueById(primaryAnnotation.techniqueId)
                    : undefined;
                  const isSelected = selectedIds.has(syllable.id);
                  const isAnnotationSelected = allAnnotations.some(
                    (annotation) => annotation.id === selectedAnnotationId,
                  );

                  return (
                    <span key={syllable.id} className="inline-flex items-baseline">
                      <button
                        type="button"
                        onClick={(event) => onSelectSyllable(syllable.id, event.shiftKey)}
                        onMouseEnter={(event) => {
                          if (event.buttons === 1) {
                            onAddDragSelection(syllable.id);
                          }
                        }}
                        className={`rounded px-1 py-0.5 text-left font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          technique ? technique.highlightClass : "text-slate-950"
                        } ${
                          technique ? "ring-1" : ""
                        } ${
                          allAnnotations.length > 1 ? "border-b-2 border-current" : ""
                        } ${
                          isSelected
                            ? "bg-cyan-100 text-cyan-950 ring-2 ring-cyan-500"
                            : ""
                        } ${
                          isAnnotationSelected ? "outline outline-2 outline-slate-900" : ""
                        }`}
                        title={
                          allAnnotations.length > 0
                            ? allAnnotations
                                .map((annotation) => {
                                  const item = getTechniqueById(annotation.techniqueId);
                                  return item ? `${item.symbol} ${item.name}` : "Technique";
                                })
                                .join(", ")
                            : `Select ${syllable.text}`
                        }
                      >
                        {syllable.text}
                      </button>
                      {syllableIndex < word.syllables.length - 1 ? (
                        <span className="text-slate-400">-</span>
                      ) : null}
                    </span>
                  );
                })}
              </span>
              <span className="mx-1.5 text-transparent"> </span>
              <span className="absolute -top-6 left-0 hidden whitespace-nowrap rounded-md border border-slate-200 bg-white p-1 text-xs shadow-sm group-hover/word:flex">
                <button
                  type="button"
                  onClick={(event) => onSelectWord(wordSyllableIds, event.shiftKey)}
                  className="rounded px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Select word
                </button>
                <button
                  type="button"
                  onClick={() => onStartEditWord(word.id)}
                  className="rounded px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit syllables
                </button>
              </span>
              {wordIndex < line.words.length - 1 ? <span className="sr-only"> </span> : null}
            </span>
          );
        })}
      </div>
      <span className="sr-only">{flatSyllables.map((syllable) => syllable.text).join(" ")}</span>
    </div>
  );
}
