"use client";

import { useMemo, useState } from "react";
import { VOICE_LABELS } from "@/lib/annotationUtils";
import type { VoicePart } from "@/lib/songTypes";

type TechniqueScopePickerProps = {
  value?: VoicePart[];
  includeBass: boolean;
  onApply?: (voices: VoicePart[]) => void;
  onChange?: (voices: VoicePart[]) => void;
  applyLabel?: string;
};

const singleScopes: VoicePart[] = ["all", "soprano", "alto", "tenor", "bass"];
const customVoices: VoicePart[] = ["soprano", "alto", "tenor", "bass"];

function normalizeVoices(voices: VoicePart[]) {
  const unique = [...new Set(voices)];

  if (unique.includes("all") || unique.length === 0) {
    return ["all"] as VoicePart[];
  }

  return unique;
}

export function TechniqueScopePicker({
  value = ["all"],
  includeBass,
  onApply,
  onChange,
  applyLabel = "Apply technique",
}: TechniqueScopePickerProps) {
  const initialScope = value.length > 1 ? "custom" : value[0] ?? "all";
  const [scopeMode, setScopeMode] = useState<VoicePart | "custom">(initialScope);
  const [customSelection, setCustomSelection] = useState<VoicePart[]>(
    value.length > 1 || !value.includes("all")
      ? value.filter((voice) => voice !== "all")
      : ["soprano", "alto", "tenor"],
  );

  const availableSingleScopes = useMemo(
    () => singleScopes.filter((scope) => includeBass || scope !== "bass"),
    [includeBass],
  );
  const availableCustomVoices = useMemo(
    () => customVoices.filter((voice) => includeBass || voice !== "bass"),
    [includeBass],
  );

  const selectedVoices =
    scopeMode === "custom" ? normalizeVoices(customSelection) : normalizeVoices([scopeMode]);

  function emit(nextVoices = selectedVoices) {
    onChange?.(nextVoices);
    onApply?.(nextVoices);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Applies to
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {availableSingleScopes.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => {
              setScopeMode(scope);
              onChange?.(normalizeVoices([scope]));
            }}
            className={`rounded-md border px-2 py-1.5 text-sm font-medium transition ${
              scopeMode === scope
                ? "border-cyan-500 bg-cyan-50 text-cyan-950"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {VOICE_LABELS[scope]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setScopeMode("custom");
            onChange?.(normalizeVoices(customSelection));
          }}
          className={`rounded-md border px-2 py-1.5 text-sm font-medium transition ${
            scopeMode === "custom"
              ? "border-cyan-500 bg-cyan-50 text-cyan-950"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Custom
        </button>
      </div>
      {scopeMode === "custom" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableCustomVoices.map((voice) => {
            const checked = customSelection.includes(voice);

            return (
              <label
                key={voice}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...customSelection, voice]
                      : customSelection.filter((item) => item !== voice);
                    setCustomSelection(next);
                    onChange?.(normalizeVoices(next));
                  }}
                  className="h-4 w-4 accent-cyan-700"
                />
                {VOICE_LABELS[voice]}
              </label>
            );
          })}
        </div>
      ) : null}
      {onApply ? (
        <button
          type="button"
          onClick={() => emit()}
          className="mt-3 w-full rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {applyLabel}
        </button>
      ) : null}
    </div>
  );
}
