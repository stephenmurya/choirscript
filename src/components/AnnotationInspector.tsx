"use client";

import { formatAnnotationLabel } from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SyllableSelectionContext } from "@/lib/songSelection";
import type { PartKey, TechniqueAnnotation, VoicePart } from "@/lib/songTypes";
import { TechniqueScopePicker } from "./TechniqueScopePicker";

type AnnotationInspectorProps = {
  selections: SyllableSelectionContext[];
  selectedText: string;
  selectedAnnotation: { lineText: string; annotation: TechniqueAnnotation } | null;
  includeBass: boolean;
  onPartChange: (part: PartKey, value: string) => void;
  onDirectorNoteChange: (value: string) => void;
  onAnnotationNoteChange: (annotationId: string, value: string) => void;
  onAnnotationScopeChange: (annotationId: string, voices: VoicePart[]) => void;
  onRemoveAnnotation: (annotationId: string) => void;
};

const partLabels: Array<{ key: PartKey; label: string }> = [
  { key: "soprano", label: "Soprano" },
  { key: "alto", label: "Alto" },
  { key: "tenor", label: "Tenor" },
  { key: "bass", label: "Bass" },
];

function getSharedValue(selections: SyllableSelectionContext[], part: PartKey) {
  if (selections.length === 0) {
    return "";
  }

  const first = selections[0].syllable[part] ?? "";
  const allMatch = selections.every((selection) => (selection.syllable[part] ?? "") === first);
  return allMatch ? first : "";
}

export function AnnotationInspector({
  selections,
  selectedText,
  selectedAnnotation,
  includeBass,
  onPartChange,
  onDirectorNoteChange,
  onAnnotationNoteChange,
  onAnnotationScopeChange,
  onRemoveAnnotation,
}: AnnotationInspectorProps) {
  const annotation = selectedAnnotation?.annotation ?? null;
  const technique = annotation ? getTechniqueById(annotation.techniqueId) : undefined;
  const selectedAnnotationText = selectedAnnotation?.lineText ?? "";
  const firstSelection = selections[0];
  const sharedNote =
    selections.length > 0 &&
    selections.every(
      (selection) =>
        (selection.syllable.directorNote ?? "") ===
        (firstSelection?.syllable.directorNote ?? ""),
    )
      ? firstSelection?.syllable.directorNote ?? ""
      : "";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Selection
      </h2>

      {annotation && technique ? (
        <div className="mt-4 space-y-4">
          <div className={`rounded-lg border p-3 ${technique.colorClass}`}>
            <p className="text-lg font-semibold">{formatAnnotationLabel(annotation)}</p>
            <p className="mt-1 text-sm opacity-85">{technique.description}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Affected lyric text</p>
            <p className="mt-1">{selectedAnnotationText}</p>
          </div>
          <TechniqueScopePicker
            value={annotation.appliesTo}
            includeBass={includeBass}
            onChange={(voices) => onAnnotationScopeChange(annotation.id, voices)}
          />
          <label className="block text-sm font-medium text-slate-700">
            Annotation note
            <textarea
              value={annotation.note ?? ""}
              onChange={(event) => onAnnotationNoteChange(annotation.id, event.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <button
            type="button"
            onClick={() => onRemoveAnnotation(annotation.id)}
            className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Remove annotation
          </button>
        </div>
      ) : null}

      {!annotation && selections.length === 0 ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Select lyric syllables, a word, a line, or an annotation badge.
        </p>
      ) : null}

      {!annotation && selections.length > 0 ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">
              {selections.length} selected syllable{selections.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1">{selectedText}</p>
          </div>
          <div className="grid gap-3">
            {partLabels
              .filter((part) => includeBass || part.key !== "bass")
              .map((part) => (
                <label key={part.key} className="block text-sm font-medium text-slate-700">
                  Quick {part.label} cue
                  <input
                    value={getSharedValue(selections, part.key)}
                    placeholder="Do, 1, C, hold, hum..."
                    onChange={(event) => onPartChange(part.key, event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              ))}
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Director note
            <textarea
              value={sharedNote}
              placeholder={
                selections.length > 1 ? "Mixed notes. Typing replaces selected notes." : ""
              }
              onChange={(event) => onDirectorNoteChange(event.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
