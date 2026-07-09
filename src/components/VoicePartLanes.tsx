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
    soprano: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    alto: "border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    tenor: "border-amber-400/40 bg-amber-500/10 text-amber-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    bass: "border-border bg-card text-muted-foreground shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
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
