"use client";

import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SyllableToken } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";

type SyllableCellProps = {
  syllable: SyllableToken;
  selected: boolean;
  variant: "lyric" | "part" | "technique";
  value?: string;
  onSelect: (id: string, additive: boolean) => void;
};

function TechniqueInlineBadges({ syllable }: { syllable: SyllableToken }) {
  if (syllable.techniques.length === 0) {
    return <span className="text-xs text-slate-400">No technique</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {syllable.techniques.map((applied) => {
        const technique = getTechniqueById(applied.techniqueId);

        if (!technique) {
          return null;
        }

        return (
          <span
            key={applied.techniqueId}
            title={`${technique.name}: ${technique.description}`}
            aria-label={`${technique.name}: ${technique.description}`}
            className="inline-flex"
          >
            <TechniqueBadge technique={technique} compact />
          </span>
        );
      })}
    </span>
  );
}

export function SyllableCell({
  syllable,
  selected,
  variant,
  value,
  onSelect,
}: SyllableCellProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => onSelect(syllable.id, event.shiftKey)}
      className={`min-h-12 rounded-md border bg-white px-2 py-2 text-left text-sm transition hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
        selected
          ? "border-cyan-600 ring-2 ring-cyan-400 ring-offset-1"
          : "border-slate-200"
      }`}
    >
      {variant === "lyric" ? (
        <span className="flex min-h-8 flex-col justify-between gap-1">
          <span className="font-semibold text-slate-950">{syllable.text}</span>
          {syllable.directorNote ? (
            <span
              title={syllable.directorNote}
              className="inline-flex w-fit rounded-full bg-slate-900 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
            >
              Note
            </span>
          ) : null}
        </span>
      ) : null}
      {variant === "part" ? (
        <span className="font-medium text-slate-700">{value?.trim() || "-"}</span>
      ) : null}
      {variant === "technique" ? <TechniqueInlineBadges syllable={syllable} /> : null}
    </button>
  );
}
