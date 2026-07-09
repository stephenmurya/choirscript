"use client";

import type { TimingEvent } from "@/lib/songTypes";
import { TIMING_EVENT_LABELS } from "@/lib/timing";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { ScriptPill } from "./ScriptPill";
import { TimingEventPopover } from "./TimingEventPopover";
import type { SongTimingSettings, TimingEventType } from "@/lib/songTypes";

type TimingEventBlockProps = {
  event: TimingEvent;
  settings: SongTimingSettings;
  fillBarUnits: number;
  selected?: boolean;
  onChangeLength: (durationUnits: number) => void;
  onAddAfter: (type: Exclude<TimingEventType, "syllable">) => void;
  onClear: () => void;
};

function pillForEvent(event: TimingEvent) {
  if (event.type === "syllable") {
    return {
      symbol: undefined,
      label: event.label || "Syllable",
      tone: "timing" as const,
    };
  }

  const label = TIMING_EVENT_LABELS[event.type];

  return {
    symbol: label.symbol,
    label: label.label,
    tone: event.type,
  };
}

export function TimingEventBlock({
  event,
  settings,
  fillBarUnits,
  selected,
  onChangeLength,
  onAddAfter,
  onClear,
}: TimingEventBlockProps) {
  const pill = pillForEvent(event);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "z-20 flex min-h-8 items-center overflow-hidden rounded-[6px] border border-transparent px-0.5 text-left transition hover:border-primary/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "bg-primary/10" : "",
            )}
          />
        }
      >
        <ScriptPill
          symbol={pill.symbol}
          label={pill.label}
          tone={selected ? "selected" : pill.tone}
          className="w-full justify-center"
        />
      </PopoverTrigger>
      <TimingEventPopover
        event={event}
        settings={settings}
        fillBarUnits={fillBarUnits}
        onChangeLength={onChangeLength}
        onAddAfter={onAddAfter}
        onClear={onClear}
      />
    </Popover>
  );
}
