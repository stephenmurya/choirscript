"use client";

import { Fragment } from "react";
import { PART_LABELS, type FlatSyllable } from "@/lib/annotationUtils";
import type { PartKey, SongLine } from "@/lib/songTypes";
import { NotationInput } from "./NotationInput";

type VoicePartLanesProps = {
  line: SongLine;
  lineIndex: number;
  syllables: FlatSyllable[];
  includeBass: boolean;
  gridStartRow: number;
  onPartCueChange: (syllableId: string, part: PartKey, value: string) => void;
};

export function VoicePartLanes({
  line,
  lineIndex,
  syllables,
  includeBass,
  gridStartRow,
  onPartCueChange,
}: VoicePartLanesProps) {
  const rows = PART_LABELS.filter((part) => includeBass || part.key !== "bass");
  const labelClass: Record<PartKey, string> = {
    soprano: "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    alto: "border-violet-300 bg-violet-50 text-violet-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    tenor: "border-amber-300 bg-amber-50 text-amber-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    bass: "border-slate-300 bg-slate-50 text-slate-700 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
  };

  return (
    <>
      {rows.map((row, rowIndex) => {
        const gridRow = gridStartRow + rowIndex;

        return (
          <Fragment key={row.key}>
          <div
            className={`sticky left-0 z-30 grid h-9 w-9 place-items-center rounded-md border text-xs font-semibold sm:h-8 sm:w-8 ${
              labelClass[row.key]
            }`}
            title={row.label}
            style={{ gridColumn: 1, gridRow }}
          >
            {row.label[0]}
          </div>
          {syllables.map((flat) => {
            const syllable = line.words[flat.wordIndex]?.syllables[flat.syllableIndex];

            return (
              <span
                key={`${row.key}-${flat.id}`}
                className="grid justify-items-center"
                style={{ gridColumn: flat.absoluteIndex + 2, gridRow }}
              >
                <NotationInput
                  value={syllable?.[row.key] ?? ""}
                  part={row.key}
                  syllableId={flat.id}
                  syllableText={flat.text}
                  lineId={line.id}
                  lineIndex={lineIndex}
                  index={flat.absoluteIndex}
                  onChange={(value) => onPartCueChange(flat.id, row.key, value)}
                />
              </span>
            );
          })}
          </Fragment>
        );
      })}
    </>
  );
}
