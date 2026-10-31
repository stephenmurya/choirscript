import { Fragment } from "react";
import { Music2, UserRound } from "lucide-react";
import { PART_LABELS } from "@/lib/annotationUtils";
import { resolveArrangement } from "@/lib/arrangement";
import { ArrangementMobileBar, ArrangementRoadmap } from "./ArrangementRoadmap";
import type { PartKey, Song, SongLine, TimingEvent, TimingScope } from "@/lib/songTypes";
import {
  getBarUnits,
  getBeatLabels,
  getEventAbsoluteStart,
  getEventsForScope,
  TIMING_EVENT_LABELS,
} from "@/lib/timing";
import { ScriptPill } from "./ScriptPill";
import { TechniqueLegend } from "./TechniqueLegend";
import { TimingGrid } from "./TimingGrid";
import { TimingLegend } from "./TimingLegend";
import { LineScroll } from "./LineScroll";
import type { RehearsalDisplayToggles } from "./ColorfulRehearsalView";
import { formatTempo } from "@/lib/songDisplay";

function flattenLineSyllables(line: SongLine) {
  return line.words.flatMap((word) => word.syllables);
}

function getSyllableById(line: SongLine, syllableId?: string) {
  if (!syllableId) {
    return undefined;
  }

  return flattenLineSyllables(line).find((syllable) => syllable.id === syllableId);
}

function eventLabel(line: SongLine, event: TimingEvent) {
  if (event.type === "syllable") {
    return getSyllableById(line, event.syllableId)?.text ?? event.label ?? "Syllable";
  }

  return TIMING_EVENT_LABELS[event.type].label;
}

function eventSymbol(event: TimingEvent) {
  return event.type === "syllable" ? undefined : TIMING_EVENT_LABELS[event.type].symbol;
}

function eventTone(event: TimingEvent) {
  return event.type === "syllable" ? "timing" : event.type;
}

function barStarts(lineTiming: NonNullable<Song["timingByLine"][string]>) {
  let start = 0;

  return lineTiming.bars.map((bar) => {
    const current = start;
    start += getBarUnits(bar);
    return current;
  });
}

function totalUnits(lineTiming: NonNullable<Song["timingByLine"][string]>) {
  return lineTiming.bars.reduce((total, bar) => total + getBarUnits(bar), 0);
}

function RowLabel({ children, row }: { children: React.ReactNode; row: number }) {
  return (
    <div
      className="sticky left-0 z-30 flex min-h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-semibold text-muted-foreground shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]"
      style={{ gridColumn: 1, gridRow: row }}
    >
      {children}
    </div>
  );
}

function ReadOnlyPartValue({
  line,
  event,
  part,
}: {
  line: SongLine;
  event: TimingEvent;
  part: PartKey;
}) {
  const syllable = getSyllableById(line, event.syllableId);

  if (event.type !== "syllable" || !syllable) {
    return (
      <ScriptPill
        symbol={eventSymbol(event)}
        label={event.type === "hold" ? "Hold" : event.type === "rest" ? "Rest" : "Break"}
        tone={eventTone(event)}
        className="min-w-10 justify-center"
      />
    );
  }

  return (
    <span className="inline-flex h-8 w-10 min-w-10 items-center justify-center rounded-md border border-border bg-muted/40 px-1.5 text-center text-xs font-medium text-foreground">
      {syllable[part]?.trim() || "\u00a0"}
    </span>
  );
}

function RehearsalTimingLine({
  song,
  sectionId,
  occurrenceId,
  line,
  toggles,
  melodyPart,
}: {
  song: Song;
  sectionId: string;
  occurrenceId: string;
  line: SongLine;
  toggles: RehearsalDisplayToggles;
  melodyPart?: PartKey | null;
}) {
  const lineTiming = song.timingByLine[line.id];

  if (!lineTiming) {
    return null;
  }

  const starts = barStarts(lineTiming);
  const units = totalUnits(lineTiming);
  const sharedEvents = getEventsForScope(lineTiming, "shared").toSorted(
    (a, b) => getEventAbsoluteStart(a, lineTiming.bars) - getEventAbsoluteStart(b, lineTiming.bars),
  );
  // A melody placement is unison: the chosen part is the only row that matters.
  // Otherwise only parts that actually have events in this line earn a row — an
  // enabled part with no content used to draw an empty label-only lane on every
  // line, which eats the phone viewport without telling the singer anything.
  const rows = melodyPart
    ? PART_LABELS.filter((part) => part.key === melodyPart)
    : PART_LABELS.filter((part) => {
        // Content wins over the voice preset — see ReadOnlyVoiceLanes: a part with
        // events must render even when a saved preset or enabledParts list does
        // not mention it.
        if (!toggles[part.key]) {
          return false;
        }

        return getEventsForScope(lineTiming, part.key as TimingScope).length > 0;
      });
  const partRowStart = 5;

  return (
    <div data-line-block="true" className="rehearsal-line line-block w-full overflow-hidden py-5">
      <LineScroll>
        <TimingGrid totalUnits={units}>
          <RowLabel row={1}>Bar</RowLabel>
          {lineTiming.bars.map((bar, index) => {
            const start = starts[index] ?? 0;
            const barUnits = getBarUnits(bar);

            return (
              <div
                key={`${occurrenceId}:${bar.id}`}
                className="flex min-h-8 items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-muted-foreground"
                style={{ gridColumn: `${start + 2} / span ${barUnits}`, gridRow: 1 }}
              >
                {bar.isPickup ? "Pickup" : `Bar ${index + 1}`}
              </div>
            );
          })}

          <RowLabel row={2}>Count</RowLabel>
          {lineTiming.bars.flatMap((bar, barIndex) =>
            getBeatLabels(song.timingSettings, bar).map((label, unitIndex) => {
              const absoluteUnit = (starts[barIndex] ?? 0) + unitIndex;

              return (
                <div
                  key={`${occurrenceId}:${bar.id}-${unitIndex}`}
                  className="flex min-h-7 items-center justify-center rounded-md bg-muted/50 text-xs font-medium text-muted-foreground"
                  style={{ gridColumn: absoluteUnit + 2, gridRow: 2 }}
                >
                  {label}
                </div>
              );
            }),
          )}

          <RowLabel row={3}>Time</RowLabel>
          {sharedEvents.map((event) => {
            const start = getEventAbsoluteStart(event, lineTiming.bars);

            return (
              <div
                key={`${occurrenceId}:${event.id}`}
                style={{ gridColumn: `${start + 2} / span ${event.durationUnits}`, gridRow: 3 }}
              >
                <ScriptPill
                  symbol={eventSymbol(event)}
                  label={eventLabel(line, event)}
                  tone={eventTone(event)}
                  className="w-full justify-center"
                />
              </div>
            );
          })}

          <RowLabel row={4}>Lyrics</RowLabel>
          {sharedEvents.map((event) => {
            const start = getEventAbsoluteStart(event, lineTiming.bars);

            return (
              <div
                key={`${occurrenceId}:lyrics-${event.id}`}
                className="flex min-h-8 items-center justify-center text-sm font-medium text-foreground"
                style={{ gridColumn: `${start + 2} / span ${event.durationUnits}`, gridRow: 4 }}
              >
                {event.type === "syllable" ? (
                  eventLabel(line, event)
                ) : (
                  <ScriptPill
                    symbol={eventSymbol(event)}
                    label={eventLabel(line, event)}
                    tone={eventTone(event)}
                  />
                )}
              </div>
            );
          })}

          {rows.map((row, rowIndex) => {
            const scope = row.key as TimingScope;
            const events = getEventsForScope(lineTiming, scope).toSorted(
              (a, b) =>
                getEventAbsoluteStart(a, lineTiming.bars) -
                getEventAbsoluteStart(b, lineTiming.bars),
            );
            const gridRow = partRowStart + rowIndex;

            return (
              <Fragment key={`${occurrenceId}:${row.key}`}>
                <div
                  className="sticky left-0 z-30 grid min-h-8 place-items-center rounded-md border border-border bg-background px-2 text-xs font-semibold text-muted-foreground shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]"
                  style={{ gridColumn: 1, gridRow }}
                  title={row.label}
                >
                  {row.label[0]}
                </div>
                {events.map((event) => {
                  const start = getEventAbsoluteStart(event, lineTiming.bars);

                  return (
                    <div
                      key={`${occurrenceId}:${row.key}-${event.id}`}
                      className="grid justify-items-center"
                      style={{
                        gridColumn: `${start + 2} / span ${event.durationUnits}`,
                        gridRow,
                      }}
                    >
                      <ReadOnlyPartValue line={line} event={event} part={row.key} />
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </TimingGrid>
      </LineScroll>
      <span className="sr-only">{sectionId}</span>
    </div>
  );
}

export function AdvancedTimingRehearsalView({
  song,
  toggles,
}: {
  song: Song;
  toggles: RehearsalDisplayToggles;
}) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_17rem]">
    <article
      className={`rehearsal-document mx-auto w-full min-w-0 max-w-[900px] px-3 pb-12 pt-6 sm:px-5 sm:pt-8 ${
        toggles.largeText ? "large-text" : ""
      } ${toggles.blackAndWhite ? "print-black-white" : ""}`}
    >
      <ArrangementMobileBar song={song} />
      <header className="pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Advanced timing rehearsal view
        </p>
        <h1 className="rehearsal-title mt-2 text-foreground">{song.title || "Untitled Song"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[song.artist ? `Singer: ${song.artist}` : null, song.key ? `Key: ${song.key}` : null, formatTempo(song.tempo) ? formatTempo(song.tempo) : null]
            .filter(Boolean)
            .join(", ")}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Meter {song.timingSettings.beatsPerBar}/{song.timingSettings.beatUnit}, subdivision{" "}
          {song.timingSettings.subdivision === "half-beat" ? "half-beat" : "beat"}
          {song.timingSettings.hasPickupBar
            ? `, pickup ${song.timingSettings.pickupBeats ?? 1} beat`
            : ""}
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-4">
        {toggles.techniques ? <TechniqueLegend song={song} /> : null}
        <TimingLegend />
      </div>

      <div className="flex flex-col gap-8">
        {resolveArrangement(song).map(({ occurrence, repeatIndex, renderIdentity, section }) => {
          const melodyPart =
            occurrence.voicing === "melody" ? occurrence.melodyPart ?? "soprano" : null;

          return (
          <section
            key={renderIdentity}
            id={`rehearsal-${renderIdentity}`}
            data-rehearsal-section="true"
            className="rehearsal-section border-b border-border pb-8 last:border-b-0"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{section.name}</h2>
              {occurrence.performer ? (
                <span
                  data-rehearsal-performer="true"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary"
                >
                  <UserRound className="size-3" />
                  {occurrence.performer}
                </span>
              ) : null}
              {melodyPart ? (
                <span
                  data-rehearsal-voicing="melody"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-300"
                >
                  <Music2 className="size-3" />
                  Melody · {melodyPart}
                </span>
              ) : null}
            </div>
            {section.lines.map((line) => (
              <RehearsalTimingLine
                key={`${renderIdentity}:${line.id}`}
                song={song}
                sectionId={section.id}
                occurrenceId={`${occurrence.id}:${repeatIndex}`}
                line={line}
                toggles={toggles}
                melodyPart={melodyPart}
              />
            ))}
          </section>
          );
        })}
      </div>
    </article>
    <ArrangementRoadmap song={song} />
    </div>
  );
}
