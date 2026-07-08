"use client";

import { useState } from "react";
import { DEFAULT_TECHNIQUES } from "@/lib/defaultTechniques";
import type { VoicePart } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";
import { TechniqueScopePicker } from "./TechniqueScopePicker";

type TechniquePaletteProps = {
  selectedCount: number;
  selectedTechniqueIds: Set<string>;
  includeBass: boolean;
  onApplyTechnique: (techniqueId: string, voices: VoicePart[]) => void;
};

export function TechniquePalette({
  selectedCount,
  selectedTechniqueIds,
  includeBass,
  onApplyTechnique,
}: TechniquePaletteProps) {
  const [pendingTechniqueId, setPendingTechniqueId] = useState<string | null>(null);
  const pendingTechnique = DEFAULT_TECHNIQUES.find(
    (technique) => technique.id === pendingTechniqueId,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Technique Palette
      </h2>
      {selectedCount === 0 ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Select one or more syllables first.
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          Applying to {selectedCount} selected syllable{selectedCount === 1 ? "" : "s"}.
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {DEFAULT_TECHNIQUES.map((technique) => {
          const isSelected = selectedTechniqueIds.has(technique.id);

          return (
            <button
              key={technique.id}
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setPendingTechniqueId(technique.id)}
              title={`${technique.name}: ${technique.description}`}
              className={`flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-55 ${technique.colorClass} ${
                isSelected || pendingTechniqueId === technique.id
                  ? "ring-2 ring-slate-900 ring-offset-1"
                  : "hover:brightness-95"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${technique.swatchClass}`}
              />
              <span className="min-w-0 flex-1">
                <TechniqueBadge technique={technique} compact className="border-0 bg-transparent p-0" />
                <span className="mt-0.5 block text-xs opacity-80">{technique.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {pendingTechnique ? (
        <div className="mt-4">
          <div className={`mb-2 rounded-md border px-3 py-2 text-sm ${pendingTechnique.colorClass}`}>
            <TechniqueBadge technique={pendingTechnique} compact className="border-0 bg-transparent p-0" />
          </div>
          <TechniqueScopePicker
            includeBass={includeBass}
            onApply={(voices) => {
              onApplyTechnique(pendingTechnique.id, voices);
              setPendingTechniqueId(null);
            }}
            applyLabel="Apply to selection"
          />
        </div>
      ) : null}
    </section>
  );
}
