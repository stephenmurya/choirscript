"use client";

import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SyllableSelectionContext } from "@/lib/songSelection";
import type { PartKey } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";

type SelectedSyllableInspectorProps = {
  selections: SyllableSelectionContext[];
  includeBass: boolean;
  onPartChange: (part: PartKey, value: string) => void;
  onDirectorNoteChange: (value: string) => void;
  onRemoveTechnique: (techniqueId: string) => void;
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

export function SelectedSyllableInspector({
  selections,
  includeBass,
  onPartChange,
  onDirectorNoteChange,
  onRemoveTechnique,
}: SelectedSyllableInspectorProps) {
  const firstSelection = selections[0];
  const appliedTechniqueIds = new Set(
    selections.flatMap((selection) =>
      selection.syllable.techniques.map((technique) => technique.techniqueId),
    ),
  );
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
        Selected Syllable
      </h2>
      {selections.length === 0 ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Select a syllable, word, or line to edit SATB cues and notes.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {selections.length === 1 ? (
              <>
                <p>
                  Lyric syllable:{" "}
                  <span className="font-semibold text-slate-950">
                    {firstSelection.syllable.text}
                  </span>
                </p>
                <p>
                  Parent word:{" "}
                  <span className="font-semibold text-slate-950">
                    {firstSelection.word.originalWord}
                  </span>
                </p>
              </>
            ) : (
              <p>
                <span className="font-semibold text-slate-950">{selections.length}</span>{" "}
                syllables selected. Changes apply to all selected syllables.
              </p>
            )}
          </div>
          <div className="grid gap-3">
            {partLabels
              .filter((part) => includeBass || part.key !== "bass")
              .map((part) => (
                <label key={part.key} className="block text-sm font-medium text-slate-700">
                  {part.label}
                  <input
                    value={getSharedValue(selections, part.key)}
                    placeholder="Do, 1, C, high, hold..."
                    onChange={(event) => onPartChange(part.key, event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Applied techniques</h3>
            {appliedTechniqueIds.size === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No techniques applied yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {[...appliedTechniqueIds].map((techniqueId) => {
                  const technique = getTechniqueById(techniqueId);

                  if (!technique) {
                    return null;
                  }

                  return (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => onRemoveTechnique(technique.id)}
                      title={`Remove ${technique.name}: ${technique.description}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold"
                    >
                      <TechniqueBadge technique={technique} compact />
                      <span>Remove</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Director note
            <textarea
              value={sharedNote}
              placeholder={
                selections.length > 1 ? "Mixed notes. Typing will replace selected notes." : ""
              }
              onChange={(event) => onDirectorNoteChange(event.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>
      )}
    </section>
  );
}
