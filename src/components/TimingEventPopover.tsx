"use client";

import type { TimingEvent, TimingEventType } from "@/lib/songTypes";
import { TIMING_EVENT_LABELS, getUnitsPerBeat } from "@/lib/timing";
import type { SongTimingSettings } from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import {
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type TimingEventPopoverProps = {
  event: TimingEvent;
  settings: SongTimingSettings;
  fillBarUnits: number;
  onChangeLength: (durationUnits: number) => void;
  onAddAfter: (type: Exclude<TimingEventType, "syllable">) => void;
  onClear: () => void;
};

function durationLabel(units: number, settings: SongTimingSettings) {
  const unitsPerBeat = getUnitsPerBeat(settings.subdivision);
  const counts = units / unitsPerBeat;

  return counts === 1 ? "1 count" : `${counts} counts`;
}

function lengthOptions(settings: SongTimingSettings, fillBarUnits: number) {
  const unitsPerBeat = getUnitsPerBeat(settings.subdivision);
  const options = settings.subdivision === "half-beat" ? [1] : [];

  options.push(unitsPerBeat, unitsPerBeat * 2, unitsPerBeat * 3, unitsPerBeat * 4);

  if (!options.includes(fillBarUnits)) {
    options.push(fillBarUnits);
  }

  return options
    .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
    .map((value) => ({
      value,
      label:
        value === fillBarUnits
          ? "Fill bar"
          : value === 1 && settings.subdivision === "half-beat"
            ? "0.5 count"
            : durationLabel(value, settings),
    }));
}

export function TimingEventPopover({
  event,
  settings,
  fillBarUnits,
  onChangeLength,
  onAddAfter,
  onClear,
}: TimingEventPopoverProps) {
  const eventLabel =
    event.type === "syllable"
      ? event.label || "Syllable"
      : `${TIMING_EVENT_LABELS[event.type].symbol} ${TIMING_EVENT_LABELS[event.type].label}`;

  return (
    <PopoverContent className="w-[min(18rem,calc(100vw-2rem))]" align="start">
      <PopoverHeader>
        <PopoverTitle>{eventLabel}</PopoverTitle>
        <PopoverDescription>Set count length or add timing after this block.</PopoverDescription>
      </PopoverHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Length
          </span>
          <div className="flex flex-wrap gap-2">
            {lengthOptions(settings, fillBarUnits).map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={event.durationUnits === option.value ? "default" : "outline"}
                onClick={() => onChangeLength(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Add after
          </span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onAddAfter("hold")}>
              — Hold
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onAddAfter("rest")}>
              ⏸ Rest
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onAddAfter("break")}>
              {"//"} Break
            </Button>
          </div>
        </div>
        <Separator />
        <Button type="button" variant="destructive" onClick={onClear}>
          Clear event
        </Button>
      </div>
    </PopoverContent>
  );
}
