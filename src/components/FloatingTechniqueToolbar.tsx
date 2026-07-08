"use client";

import { DEFAULT_TECHNIQUES } from "@/lib/defaultTechniques";
import type { VoicePart } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";

type FloatingTechniqueToolbarProps = {
  selectedCount: number;
  selectedText: string;
  onApplyTechnique: (techniqueId: string, voices: VoicePart[]) => void;
};

export function FloatingTechniqueToolbar({
  selectedCount,
  selectedText,
  onApplyTechnique,
}: FloatingTechniqueToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-[4.5rem] z-10 mb-4 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Selection
          </p>
          <p className="mt-0.5 max-w-xl truncate text-sm font-medium text-slate-800">
            {selectedText || `${selectedCount} syllables selected`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_TECHNIQUES.slice(0, 5).map((technique) => (
            <button
              key={technique.id}
              type="button"
              onClick={() => onApplyTechnique(technique.id, ["all"])}
              title={`Apply ${technique.name} to all voices`}
              className="rounded-full transition hover:brightness-95"
            >
              <TechniqueBadge technique={technique} compact />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
