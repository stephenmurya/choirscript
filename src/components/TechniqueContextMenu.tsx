"use client";

import { DEFAULT_TECHNIQUES } from "@/lib/defaultTechniques";
import { TechniqueBadge } from "./TechniqueBadge";

type TechniqueContextMenuProps = {
  position: { x: number; y: number } | null;
  onApplyTechnique: (techniqueId: string) => void;
};

export function TechniqueContextMenu({
  position,
  onApplyTechnique,
}: TechniqueContextMenuProps) {
  if (!position) {
    return null;
  }

  return (
    <div
      data-technique-menu="true"
      className="fixed z-50 w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/80"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Apply technique"
    >
      <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Apply technique
      </p>
      <div className="grid gap-1">
        {DEFAULT_TECHNIQUES.map((technique) => (
          <button
            key={technique.id}
            type="button"
            role="menuitem"
            onClick={() => onApplyTechnique(technique.id)}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${technique.swatchClass}`}
            />
            <TechniqueBadge technique={technique} compact />
          </button>
        ))}
      </div>
    </div>
  );
}
