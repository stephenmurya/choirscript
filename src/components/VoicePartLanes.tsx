"use client";

import { PART_LABELS, type FlatSyllable } from "@/lib/annotationUtils";
import type { PartKey, SongLine } from "@/lib/songTypes";
import { NotationInput } from "./NotationInput";

type VoicePartLanesProps = {
  line: SongLine;
  lineIndex: number;
  syllables: FlatSyllable[];
  includeBass: boolean;
  onPartCueChange: (syllableId: string, part: PartKey, value: string) => void;
};

export function VoicePartLanes({
  line,
  lineIndex,
  syllables,
  includeBass,
  onPartCueChange,
}: VoicePartLanesProps) {
  const rows = PART_LABELS.filter((part) => includeBass || part.key !== "bass");
  const gridStyle = {
    gridTemplateColumns: `var(--line-label-col, 2.75rem) repeat(${Math.max(
      syllables.length,
      1,
    )}, minmax(var(--syllable-col-min, 2.75rem), max-content))`,
  };
  const labelClass: Record<PartKey, string> = {
    soprano: "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    alto: "border-violet-300 bg-violet-50 text-violet-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    tenor: "border-amber-300 bg-amber-50 text-amber-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    bass: "border-slate-300 bg-slate-50 text-slate-700 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
  };

  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.key} className="grid items-center gap-x-1.5" style={gridStyle}>
          <div
            className={`sticky left-0 z-30 grid h-9 w-9 place-items-center rounded-md border text-xs font-semibold sm:h-8 sm:w-8 ${
              labelClass[row.key]
            }`}
            title={row.label}
            style={{ gridColumn: 1 }}
          >
            {row.label[0]}
          </div>
          {syllables.map((flat) => {
            const syllable = line.words[flat.wordIndex]?.syllables[flat.syllableIndex];

            return (
              <NotationInput
                key={`${row.key}-${flat.id}`}
                value={syllable?.[row.key] ?? ""}
                part={row.key}
                syllableId={flat.id}
                syllableText={flat.text}
                lineId={line.id}
                lineIndex={lineIndex}
                index={flat.absoluteIndex}
                onChange={(value) => onPartCueChange(flat.id, row.key, value)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
