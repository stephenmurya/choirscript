"use client";

import { Fragment } from "react";
import { getAnnotationsForSyllable } from "@/lib/annotationUtils";
import { PART_LABELS } from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type {
  LineTiming,
  PartKey,
  SongLine,
  SongTimingSettings,
  TimingEvent,
  TimingEventType,
  TimingScope,
} from "@/lib/songTypes";
import {
  addBarToLineTiming,
  changeLineTimingEventDuration,
  clearLineTimingEvent,
  getBarUnits,
  getBeatLabels,
  getEventAbsoluteStart,
  getEventsForScope,
  getUnitsPerBeat,
  insertLineTimingEventAfter,
  insertLineTimingEventAt,
  removeEmptyLastBar,
  TIMING_EVENT_LABELS,
} from "@/lib/timing";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { NotationInput } from "./NotationInput";
import { ScriptPill } from "./ScriptPill";
import { TechniqueBadge } from "./TechniqueBadge";
import { TimingEventBlock } from "./TimingEventBlock";
import { TimingGrid } from "./TimingGrid";

type AdvancedTimingLineProps = {
  sectionId: string;
  line: SongLine;
  lineIndex: number;
  lineTiming: LineTiming;
  settings: SongTimingSettings;
  includeBass: boolean;
  timingScope: TimingScope;
  onLineTimingChange: (lineTiming: LineTiming) => void;
  onPartCueChange: (
    sectionId: string,
    lineId: string,
    syllableId: string,
    part: PartKey,
    value: string,
  ) => void;
};

function flattenLineSyllables(line: SongLine) {
  return line.words.flatMap((word, wordIndex) =>
    word.syllables.map((syllable, syllableIndex) => ({
      syllable,
      word,
      wordIndex,
      syllableIndex,
    })),
  );
}

function getSyllableText(line: SongLine, syllableId?: string) {
  if (!syllableId) {
    return "";
  }

  return flattenLineSyllables(line).find((item) => item.syllable.id === syllableId)?.syllable.text ?? "";
}

function getSyllableById(line: SongLine, syllableId?: string) {
  if (!syllableId) {
    return undefined;
  }

  return flattenLineSyllables(line).find((item) => item.syllable.id === syllableId)?.syllable;
}

function eventDisplayLabel(line: SongLine, event: TimingEvent) {
  if (event.type === "syllable") {
    return getSyllableText(line, event.syllableId) || event.label || "Syllable";
  }

  return TIMING_EVENT_LABELS[event.type].label;
}

function eventSymbol(event: TimingEvent) {
  return event.type === "syllable" ? undefined : TIMING_EVENT_LABELS[event.type].symbol;
}

function eventTone(event: TimingEvent) {
  if (event.type === "syllable") {
    return "timing" as const;
  }

  return event.type;
}

function barStarts(lineTiming: LineTiming) {
  let start = 0;

  return lineTiming.bars.map((bar) => {
    const current = start;
    start += getBarUnits(bar);
    return current;
  });
}

function getTotalUnits(lineTiming: LineTiming) {
  return lineTiming.bars.reduce((total, bar) => total + getBarUnits(bar), 0);
}

function getBarFillUnits(lineTiming: LineTiming, event: TimingEvent) {
  const bar = lineTiming.bars.find((item) => item.id === event.barId);

  return Math.max(1, (bar ? getBarUnits(bar) : event.durationUnits) - event.startUnit);
}

function RowLabel({ children, row }: { children: React.ReactNode; row: number }) {
  return (
    <div
      className="sticky left-0 z-30 flex min-h-8 items-center justify-center rounded-md border border-border bg-card px-2 text-xs font-semibold text-muted-foreground shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]"
      style={{ gridColumn: 1, gridRow: row }}
    >
      {children}
    </div>
  );
}

function EmptyTimingCell({
  absoluteUnit,
  gridColumn,
  onAdd,
  canAddSyllable,
}: {
  absoluteUnit: number;
  gridColumn: number;
  onAdd: (type: TimingEventType) => void;
  canAddSyllable: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="min-h-8 rounded-md border border-dashed border-border/70 bg-muted/30 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            style={{ gridColumn, gridRow: 3 }}
            aria-label={`Add timing at unit ${absoluteUnit + 1}`}
          />
        }
      />
      <PopoverContent className="w-[min(16rem,calc(100vw-2rem))]" align="start">
        <PopoverHeader>
          <PopoverTitle>Add timing</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canAddSyllable}
            onClick={() => onAdd("syllable")}
          >
            Add syllable here
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd("hold")}>
            — Hold
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd("rest")}>
            ⏸ Rest
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd("break")}>
            {"//"} Break
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AdvancedTimingLine({
  sectionId,
  line,
  lineIndex,
  lineTiming,
  settings,
  includeBass,
  timingScope,
  onLineTimingChange,
  onPartCueChange,
}: AdvancedTimingLineProps) {
  const starts = barStarts(lineTiming);
  const totalUnits = getTotalUnits(lineTiming);
  const activeEvents = getEventsForScope(lineTiming, timingScope).toSorted(
    (a, b) => getEventAbsoluteStart(a, lineTiming.bars) - getEventAbsoluteStart(b, lineTiming.bars),
  );
  const syllables = flattenLineSyllables(line);
  const timedSyllableIds = new Set(
    activeEvents
      .filter((event) => event.type === "syllable")
      .map((event) => event.syllableId)
      .filter(Boolean) as string[],
  );
  const missingSyllables = syllables.filter((item) => !timedSyllableIds.has(item.syllable.id));
  const occupiedUnits = new Set<number>();

  activeEvents.forEach((event) => {
    const start = getEventAbsoluteStart(event, lineTiming.bars);
    for (let unit = start; unit < start + event.durationUnits; unit += 1) {
      occupiedUnits.add(unit);
    }
  });

  const rows = PART_LABELS.filter((part) => includeBass || part.key !== "bass");
  const voiceStartRow = 5;

  function updateLine(nextLineTiming: LineTiming) {
    onLineTimingChange(nextLineTiming);
  }

  function addAt(absoluteUnit: number, type: TimingEventType) {
    const defaultDuration = type === "syllable" ? getUnitsPerBeat(settings.subdivision) : 1;
    const nextSyllable = missingSyllables[0]?.syllable;

    if (type === "syllable" && !nextSyllable) {
      return;
    }

    updateLine(
      insertLineTimingEventAt(
        lineTiming,
        timingScope,
        absoluteUnit,
        {
          type,
          sectionId,
          lineId: line.id,
          scope: timingScope,
          syllableId: type === "syllable" ? nextSyllable.id : undefined,
          durationUnits: defaultDuration,
          label: type === "syllable" ? nextSyllable.text : TIMING_EVENT_LABELS[type].label,
        },
        settings,
      ),
    );
  }

  return (
    <article data-line-block="true" className="line-block timing-line w-full overflow-hidden py-5">
      <div
        data-line-scroll="true"
        className="line-scroll max-w-full overflow-x-auto overscroll-x-contain pb-2"
      >
        <TimingGrid totalUnits={totalUnits}>
          <RowLabel row={1}>Bar</RowLabel>
          {lineTiming.bars.map((bar, index) => {
            const units = getBarUnits(bar);
            const start = starts[index] ?? 0;

            return (
              <div
                key={bar.id}
                className="flex min-h-8 items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-muted-foreground"
                style={{ gridColumn: `${start + 2} / span ${units}`, gridRow: 1 }}
              >
                {bar.isPickup ? "Pickup" : `Bar ${index + 1}`}
              </div>
            );
          })}

          <RowLabel row={2}>Count</RowLabel>
          {lineTiming.bars.flatMap((bar, barIndex) =>
            getBeatLabels(settings, bar).map((label, unitIndex) => {
              const absoluteUnit = (starts[barIndex] ?? 0) + unitIndex;

              return (
                <div
                  key={`${bar.id}-${unitIndex}`}
                  className="flex min-h-7 items-center justify-center rounded-md bg-muted/50 text-xs font-medium text-muted-foreground"
                  style={{ gridColumn: absoluteUnit + 2, gridRow: 2 }}
                >
                  {label}
                </div>
              );
            }),
          )}

          <RowLabel row={3}>Time</RowLabel>
          {Array.from({ length: totalUnits }, (_, absoluteUnit) => (
            <EmptyTimingCell
              key={`empty-${absoluteUnit}`}
              absoluteUnit={absoluteUnit}
              gridColumn={absoluteUnit + 2}
              canAddSyllable={missingSyllables.length > 0}
              onAdd={(type) => addAt(absoluteUnit, type)}
            />
          ))}
          {activeEvents.map((event) => {
            const absoluteStart = getEventAbsoluteStart(event, lineTiming.bars);

            return (
              <div
                key={event.id}
                style={{
                  gridColumn: `${absoluteStart + 2} / span ${event.durationUnits}`,
                  gridRow: 3,
                }}
              >
                <TimingEventBlock
                  event={{ ...event, label: eventDisplayLabel(line, event) }}
                  settings={settings}
                  fillBarUnits={getBarFillUnits(lineTiming, event)}
                  onChangeLength={(durationUnits) =>
                    updateLine(
                      changeLineTimingEventDuration(
                        lineTiming,
                        timingScope,
                        event.id,
                        durationUnits,
                        settings,
                      ),
                    )
                  }
                  onAddAfter={(type) =>
                    updateLine(
                      insertLineTimingEventAfter(
                        lineTiming,
                        timingScope,
                        event.id,
                        type,
                        1,
                        settings,
                      ),
                    )
                  }
                  onClear={() =>
                    updateLine(clearLineTimingEvent(lineTiming, timingScope, event.id, settings))
                  }
                />
              </div>
            );
          })}

          <RowLabel row={4}>Lyrics</RowLabel>
          {activeEvents.map((event) => {
            const absoluteStart = getEventAbsoluteStart(event, lineTiming.bars);
            const annotations =
              event.type === "syllable" && event.syllableId
                ? getAnnotationsForSyllable(line, event.syllableId)
                : [];

            return (
              <div
                key={`lyric-${event.id}`}
                className="flex min-h-8 items-center justify-center gap-1 overflow-hidden rounded-md px-1 text-center text-sm font-medium text-foreground"
                style={{
                  gridColumn: `${absoluteStart + 2} / span ${event.durationUnits}`,
                  gridRow: 4,
                }}
              >
                {event.type === "syllable" ? (
                  <span className="truncate">{eventDisplayLabel(line, event)}</span>
                ) : (
                  <ScriptPill
                    symbol={eventSymbol(event)}
                    label={eventDisplayLabel(line, event)}
                    tone={eventTone(event)}
                  />
                )}
                {annotations.slice(0, 1).map((annotation) => {
                  const technique = getTechniqueById(annotation.techniqueId);
                  return technique ? <TechniqueBadge key={annotation.id} technique={technique} /> : null;
                })}
              </div>
            );
          })}

          {rows.map((row, rowIndex) => {
            const gridRow = voiceStartRow + rowIndex;

            return (
              <Fragment key={row.key}>
                <div
                  className="sticky left-0 z-30 grid min-h-8 place-items-center rounded-md border border-border bg-card px-2 text-xs font-semibold text-muted-foreground shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]"
                  style={{ gridColumn: 1, gridRow }}
                  title={row.label}
                >
                  {row.label[0]}
                </div>
                {activeEvents.map((event, eventIndex) => {
                  const absoluteStart = getEventAbsoluteStart(event, lineTiming.bars);
                  const syllable = getSyllableById(line, event.syllableId);

                  return (
                    <div
                      key={`${row.key}-${event.id}`}
                      className="grid justify-items-center"
                      style={{
                        gridColumn: `${absoluteStart + 2} / span ${event.durationUnits}`,
                        gridRow,
                      }}
                    >
                      {event.type === "syllable" && syllable ? (
                        <NotationInput
                          value={syllable[row.key] ?? ""}
                          part={row.key}
                          syllableId={syllable.id}
                          syllableText={syllable.text}
                          lineId={line.id}
                          lineIndex={lineIndex}
                          index={eventIndex}
                          onChange={(value) =>
                            onPartCueChange(sectionId, line.id, syllable.id, row.key, value)
                          }
                        />
                      ) : (
                        <ScriptPill
                          symbol={eventSymbol(event)}
                          label={event.type === "hold" ? "Hold" : event.type === "rest" ? "Rest" : "Break"}
                          tone={eventTone(event)}
                          className="min-w-10 justify-center"
                        />
                      )}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </TimingGrid>
      </div>

      <div className="no-print mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => updateLine(addBarToLineTiming(lineTiming, settings))}
        >
          Add bar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => updateLine(removeEmptyLastBar(lineTiming))}
        >
          Remove empty last bar
        </Button>
      </div>
      <Separator className="mt-5" />
    </article>
  );
}
