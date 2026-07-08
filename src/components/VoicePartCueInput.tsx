"use client";

import type { PartKey } from "@/lib/songTypes";

type VoicePartCueInputProps = {
  value: string;
  part: PartKey;
  syllableText: string;
  onChange: (value: string) => void;
};

export function VoicePartCueInput({
  value,
  part,
  syllableText,
  onChange,
}: VoicePartCueInputProps) {
  return (
    <input
      aria-label={`${part} cue for ${syllableText}`}
      value={value}
      placeholder="cue"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className="min-w-12 rounded-md border border-transparent bg-slate-50 px-2 py-1.5 text-center text-sm text-slate-800 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
    />
  );
}
