import type {
  Bar,
  LineTiming,
  Song,
  SongLine,
  SongTimingSettings,
  TimingEvent,
  TimingEventType,
  TimingScope,
  TimingSubdivision,
  VocalPart,
} from "./songTypes";

export const DEFAULT_TIMING_SETTINGS: SongTimingSettings = {
  meterPreset: "4/4",
  beatsPerBar: 4,
  beatUnit: 4,
  subdivision: "beat",
  hasPickupBar: false,
};

export const TIMING_EVENT_LABELS: Record<
  Exclude<TimingEventType, "syllable">,
  { symbol: string; label: string }
> = {
  hold: { symbol: "\u2014", label: "Hold" },
  rest: { symbol: "\u23f8", label: "Rest" },
  break: { symbol: "//", label: "Break" },
};

function createTimingId(prefix = "timing") {
  const randomValue =
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomValue}`;
}

function flattenLineSyllables(line: SongLine) {
  return line.words.flatMap((word) => word.syllables);
}

function normalizeSettings(settings?: Partial<SongTimingSettings>): SongTimingSettings {
  const meterPreset = settings?.meterPreset ?? DEFAULT_TIMING_SETTINGS.meterPreset;
  const beatsPerBar =
    meterPreset === "3/4"
      ? 3
      : meterPreset === "6/8"
        ? 6
        : Number(settings?.beatsPerBar) > 0
          ? Number(settings?.beatsPerBar)
          : DEFAULT_TIMING_SETTINGS.beatsPerBar;
  const beatUnit =
    meterPreset === "6/8"
      ? 8
      : meterPreset === "custom"
        ? [2, 4, 8, 16].includes(Number(settings?.beatUnit))
          ? Number(settings?.beatUnit)
          : DEFAULT_TIMING_SETTINGS.beatUnit
        : 4;

  return {
    meterPreset,
    beatsPerBar,
    beatUnit,
    subdivision: settings?.subdivision ?? DEFAULT_TIMING_SETTINGS.subdivision,
    hasPickupBar: Boolean(settings?.hasPickupBar),
    pickupBeats: settings?.hasPickupBar
      ? Math.max(0.5, Number(settings.pickupBeats ?? 1))
      : undefined,
  };
}

export function getUnitsPerBeat(subdivision: TimingSubdivision) {
  return subdivision === "half-beat" ? 2 : 1;
}

export function getUnitsPerBar(settings: SongTimingSettings) {
  return settings.beatsPerBar * getUnitsPerBeat(settings.subdivision);
}

export function getBarUnits(bar: Bar) {
  return bar.beats * getUnitsPerBeat(bar.subdivision);
}

export function getBeatLabel(unitIndex: number, settings: SongTimingSettings) {
  if (settings.subdivision === "beat") {
    return String(unitIndex + 1);
  }

  return unitIndex % 2 === 0 ? String(Math.floor(unitIndex / 2) + 1) : "&";
}

export function getBeatLabels(settings: SongTimingSettings, bar: Bar) {
  const barSettings = { ...settings, subdivision: bar.subdivision };

  return Array.from({ length: getBarUnits(bar) }, (_, unitIndex) =>
    getBeatLabel(unitIndex, barSettings),
  );
}

export function getPickupBeatOptions(settings: SongTimingSettings) {
  const step = settings.subdivision === "half-beat" ? 0.5 : 1;
  const values: number[] = [];

  for (let value = step; value < settings.beatsPerBar; value += step) {
    values.push(value);
  }

  return values.length ? values : [step];
}

function pickupUnits(settings: SongTimingSettings) {
  if (!settings.hasPickupBar) {
    return 0;
  }

  return Math.max(
    1,
    Math.min(
      getUnitsPerBar(settings),
      Math.round((settings.pickupBeats ?? 1) * getUnitsPerBeat(settings.subdivision)),
    ),
  );
}

function barStarts(bars: Bar[]) {
  let current = 0;

  return bars.map((bar) => {
    const start = current;
    current += getBarUnits(bar);
    return start;
  });
}

function getAbsoluteStart(event: TimingEvent, bars: Bar[]) {
  const starts = barStarts(bars);
  const barIndex = bars.findIndex((bar) => bar.id === event.barId);

  return (starts[barIndex] ?? 0) + event.startUnit;
}

function createBar({
  sectionId,
  lineId,
  index,
  settings,
  isPickup = false,
}: {
  sectionId: string;
  lineId: string;
  index: number;
  settings: SongTimingSettings;
  isPickup?: boolean;
}): Bar {
  const unitsPerBeat = getUnitsPerBeat(settings.subdivision);
  const beats = isPickup
    ? Math.max(0.5, pickupUnits(settings) / unitsPerBeat)
    : settings.beatsPerBar;

  return {
    id: createTimingId("bar"),
    sectionId,
    lineId,
    index,
    isPickup,
    beats,
    beatUnit: settings.beatUnit,
    subdivision: settings.subdivision,
  };
}

export function createBarsForLine(
  line: SongLine,
  settings: SongTimingSettings,
  syllableCount: number,
  sectionId = "",
) {
  const durationPerSyllable = getUnitsPerBeat(settings.subdivision);
  return createBarsForTotalUnits({
    sectionId,
    lineId: line.id,
    settings,
    totalUnits: Math.max(durationPerSyllable, syllableCount * durationPerSyllable),
  });
}

export function createBarsForTotalUnits({
  sectionId,
  lineId,
  settings,
  totalUnits,
}: {
  sectionId: string;
  lineId: string;
  settings: SongTimingSettings;
  totalUnits: number;
}) {
  const bars: Bar[] = [];
  let availableUnits = 0;

  if (settings.hasPickupBar) {
    const pickupBar = createBar({
      sectionId,
      lineId,
      index: 0,
      settings,
      isPickup: true,
    });
    bars.push(pickupBar);
    availableUnits += getBarUnits(pickupBar);
  }

  while (bars.length === 0 || availableUnits < totalUnits) {
    const bar = createBar({
      sectionId,
      lineId,
      index: bars.length,
      settings,
    });
    bars.push(bar);
    availableUnits += getBarUnits(bar);
  }

  return bars.map((bar, index) => ({ ...bar, index }));
}

function placeAbsoluteEvent(event: TimingEvent, bars: Bar[], absoluteStart: number): TimingEvent {
  const starts = barStarts(bars);
  const barIndex = starts.findIndex((start, index) => {
    const end = start + getBarUnits(bars[index]);
    return absoluteStart >= start && absoluteStart < end;
  });
  const resolvedBarIndex = barIndex === -1 ? bars.length - 1 : barIndex;
  const bar = bars[resolvedBarIndex];

  return {
    ...event,
    barId: bar.id,
    startUnit: Math.max(0, absoluteStart - (starts[resolvedBarIndex] ?? 0)),
  };
}

function eventsToAbsolute(events: TimingEvent[], bars: Bar[]) {
  return events.map((event) => ({
    event,
    absoluteStart: getAbsoluteStart(event, bars),
  }));
}

function reassignEventsToBars(events: TimingEvent[], oldBars: Bar[], newBars: Bar[]) {
  return eventsToAbsolute(events, oldBars)
    .map(({ event, absoluteStart }) => placeAbsoluteEvent(event, newBars, absoluteStart))
    .toSorted((a, b) => getAbsoluteStart(a, newBars) - getAbsoluteStart(b, newBars));
}

function maxEventEnd(events: TimingEvent[], bars: Bar[]) {
  return events.reduce(
    (max, event) => Math.max(max, getAbsoluteStart(event, bars) + event.durationUnits),
    0,
  );
}

function normalizeLineBars(lineTiming: LineTiming, settings: SongTimingSettings) {
  const allEvents = [
    ...lineTiming.sharedEvents,
    ...Object.values(lineTiming.partOverrides).flatMap((events) => events ?? []),
  ];
  const totalUnits = Math.max(getUnitsPerBar(settings), maxEventEnd(allEvents, lineTiming.bars));

  return createBarsForTotalUnits({
    sectionId: lineTiming.bars[0]?.sectionId ?? allEvents[0]?.sectionId ?? "",
    lineId: lineTiming.lineId,
    settings,
    totalUnits,
  });
}

export function rebarLineTiming(lineTiming: LineTiming, settings: SongTimingSettings): LineTiming {
  const previousBars = lineTiming.bars.length
    ? lineTiming.bars
    : createBarsForTotalUnits({
        sectionId: "",
        lineId: lineTiming.lineId,
        settings,
        totalUnits: getUnitsPerBar(settings),
      });
  const baseLineTiming = { ...lineTiming, bars: previousBars };
  const nextBars = normalizeLineBars(baseLineTiming, settings);

  return {
    ...lineTiming,
    bars: nextBars,
    sharedEvents: reassignEventsToBars(lineTiming.sharedEvents, previousBars, nextBars),
    partOverrides: Object.fromEntries(
      Object.entries(lineTiming.partOverrides).map(([part, events]) => [
        part,
        reassignEventsToBars(events ?? [], previousBars, nextBars),
      ]),
    ) as LineTiming["partOverrides"],
  };
}

export function createDefaultTimingForLine(
  line: SongLine,
  settings: SongTimingSettings,
  sectionId = "",
): LineTiming {
  const syllables = flattenLineSyllables(line);
  const durationUnits = getUnitsPerBeat(settings.subdivision);
  const bars = createBarsForLine(line, settings, syllables.length, sectionId);
  let absoluteStart = 0;

  const sharedEvents = syllables.map((syllable) => {
    const event: TimingEvent = {
      id: createTimingId("event"),
      type: "syllable",
      syllableId: syllable.id,
      sectionId,
      lineId: line.id,
      barId: bars[0].id,
      scope: "shared",
      startUnit: 0,
      durationUnits,
      label: syllable.text,
    };
    const placedEvent = placeAbsoluteEvent(event, bars, absoluteStart);
    absoluteStart += durationUnits;
    return placedEvent;
  });

  return {
    lineId: line.id,
    bars,
    sharedEvents,
    partOverrides: {},
  };
}

export function normalizeTimingEvents(events: TimingEvent[]) {
  return events
    .map((event) => ({
      ...event,
      id: event.id || createTimingId("event"),
      type: event.type ?? "syllable",
      scope: event.scope ?? "shared",
      startUnit: Math.max(0, Number(event.startUnit) || 0),
      durationUnits: Math.max(1, Number(event.durationUnits) || 1),
    }))
    .toSorted((a, b) => a.barId.localeCompare(b.barId) || a.startUnit - b.startUnit);
}

export function shiftEventsAfter(
  events: TimingEvent[],
  afterEventId: string,
  byUnits: number,
) {
  const target = events.find((event) => event.id === afterEventId);

  if (!target || byUnits === 0) {
    return events;
  }

  const targetStart = target.startUnit;

  return events.map((event) =>
    event.id !== target.id && event.barId === target.barId && event.startUnit > targetStart
      ? { ...event, startUnit: Math.max(0, event.startUnit + byUnits) }
      : event,
  );
}

export function changeEventDuration(
  events: TimingEvent[],
  eventId: string,
  durationUnits: number,
) {
  return events.map((event) =>
    event.id === eventId ? { ...event, durationUnits: Math.max(1, durationUnits) } : event,
  );
}

function addEventAfter(
  events: TimingEvent[],
  eventId: string,
  type: Exclude<TimingEventType, "syllable">,
  durationUnits: number,
) {
  const target = events.find((event) => event.id === eventId);

  if (!target) {
    return events;
  }

  return [
    ...events,
    {
      id: createTimingId("event"),
      type,
      sectionId: target.sectionId,
      lineId: target.lineId,
      barId: target.barId,
      scope: target.scope,
      startUnit: target.startUnit + target.durationUnits,
      durationUnits: Math.max(1, durationUnits),
      label: TIMING_EVENT_LABELS[type].label,
    },
  ];
}

export function addHoldAfter(events: TimingEvent[], eventId: string, durationUnits: number) {
  return addEventAfter(events, eventId, "hold", durationUnits);
}

export function addRestAfter(events: TimingEvent[], eventId: string, durationUnits: number) {
  return addEventAfter(events, eventId, "rest", durationUnits);
}

export function addBreakAfter(events: TimingEvent[], eventId: string, durationUnits: number) {
  return addEventAfter(events, eventId, "break", durationUnits);
}

export function getEventsForScope(lineTiming: LineTiming, scope: TimingScope) {
  if (scope === "shared") {
    return lineTiming.sharedEvents;
  }

  return lineTiming.partOverrides[scope] ?? lineTiming.sharedEvents;
}

export function updateEventsForScope(
  lineTiming: LineTiming,
  scope: TimingScope,
  events: TimingEvent[],
) {
  if (scope === "shared") {
    return { ...lineTiming, sharedEvents: normalizeTimingEvents(events) };
  }

  return {
    ...lineTiming,
    partOverrides: {
      ...lineTiming.partOverrides,
      [scope]: normalizeTimingEvents(events),
    },
  };
}

function retimeEvents(
  lineTiming: LineTiming,
  scope: TimingScope,
  mutator: (
    events: Array<{ event: TimingEvent; absoluteStart: number }>,
  ) => Array<{ event: TimingEvent; absoluteStart: number }>,
  settings: SongTimingSettings,
) {
  const events = getEventsForScope(lineTiming, scope);
  const absoluteEvents = eventsToAbsolute(events, lineTiming.bars).toSorted(
    (a, b) => a.absoluteStart - b.absoluteStart,
  );
  const nextAbsoluteEvents = mutator(absoluteEvents).toSorted(
    (a, b) => a.absoluteStart - b.absoluteStart,
  );
  const totalUnits = Math.max(
    getUnitsPerBar(settings),
    ...nextAbsoluteEvents.map(({ event, absoluteStart }) => absoluteStart + event.durationUnits),
  );
  const bars = createBarsForTotalUnits({
    sectionId: lineTiming.bars[0]?.sectionId ?? nextAbsoluteEvents[0]?.event.sectionId ?? "",
    lineId: lineTiming.lineId,
    settings,
    totalUnits,
  });
  const nextEvents = nextAbsoluteEvents.map(({ event, absoluteStart }) =>
    placeAbsoluteEvent(event, bars, absoluteStart),
  );

  return updateEventsForScope({ ...lineTiming, bars }, scope, nextEvents);
}

export function changeLineTimingEventDuration(
  lineTiming: LineTiming,
  scope: TimingScope,
  eventId: string,
  durationUnits: number,
  settings: SongTimingSettings,
) {
  return retimeEvents(
    lineTiming,
    scope,
    (events) => {
      const target = events.find(({ event }) => event.id === eventId);

      if (!target) {
        return events;
      }

      const nextDuration = Math.max(1, durationUnits);
      const delta = nextDuration - target.event.durationUnits;

      return events.map((item) => {
        if (item.event.id === eventId) {
          return { ...item, event: { ...item.event, durationUnits: nextDuration } };
        }

        return item.absoluteStart > target.absoluteStart
          ? { ...item, absoluteStart: Math.max(0, item.absoluteStart + delta) }
          : item;
      });
    },
    settings,
  );
}

export function insertLineTimingEventAfter(
  lineTiming: LineTiming,
  scope: TimingScope,
  eventId: string,
  type: Exclude<TimingEventType, "syllable">,
  durationUnits: number,
  settings: SongTimingSettings,
) {
  return retimeEvents(
    lineTiming,
    scope,
    (events) => {
      const target = events.find(({ event }) => event.id === eventId);

      if (!target) {
        return events;
      }

      const insertAt = target.absoluteStart + target.event.durationUnits;
      const event: TimingEvent = {
        id: createTimingId("event"),
        type,
        sectionId: target.event.sectionId,
        lineId: target.event.lineId,
        barId: target.event.barId,
        scope,
        startUnit: target.event.startUnit,
        durationUnits: Math.max(1, durationUnits),
        label: TIMING_EVENT_LABELS[type].label,
      };

      return [
        ...events.map((item) =>
          item.absoluteStart >= insertAt
            ? { ...item, absoluteStart: item.absoluteStart + event.durationUnits }
            : item,
        ),
        { event, absoluteStart: insertAt },
      ];
    },
    settings,
  );
}

export function insertLineTimingEventAt(
  lineTiming: LineTiming,
  scope: TimingScope,
  absoluteStart: number,
  event: Omit<TimingEvent, "id" | "barId" | "startUnit">,
  settings: SongTimingSettings,
) {
  return retimeEvents(
    lineTiming,
    scope,
    (events) => [
      ...events.map((item) =>
        item.absoluteStart >= absoluteStart
          ? { ...item, absoluteStart: item.absoluteStart + event.durationUnits }
          : item,
      ),
      {
        event: {
          ...event,
          id: createTimingId("event"),
          barId: lineTiming.bars[0]?.id ?? "",
          startUnit: 0,
        },
        absoluteStart,
      },
    ],
    settings,
  );
}

export function clearLineTimingEvent(
  lineTiming: LineTiming,
  scope: TimingScope,
  eventId: string,
  settings: SongTimingSettings,
) {
  return retimeEvents(
    lineTiming,
    scope,
    (events) => events.filter(({ event }) => event.id !== eventId),
    settings,
  );
}

export function addBarToLineTiming(lineTiming: LineTiming, settings: SongTimingSettings) {
  const sectionId = lineTiming.bars[0]?.sectionId ?? "";
  const nextBar = createBar({
    sectionId,
    lineId: lineTiming.lineId,
    index: lineTiming.bars.length,
    settings,
  });

  return { ...lineTiming, bars: [...lineTiming.bars, nextBar] };
}

export function removeEmptyLastBar(lineTiming: LineTiming) {
  if (lineTiming.bars.length <= 1) {
    return lineTiming;
  }

  const lastBar = lineTiming.bars[lineTiming.bars.length - 1];
  const hasEvents = [
    ...lineTiming.sharedEvents,
    ...Object.values(lineTiming.partOverrides).flatMap((events) => events ?? []),
  ].some((event) => event.barId === lastBar.id);

  if (hasEvents) {
    return lineTiming;
  }

  return { ...lineTiming, bars: lineTiming.bars.slice(0, -1) };
}

export function createPartOverrideFromShared(lineTiming: LineTiming, part: VocalPart) {
  if (lineTiming.partOverrides[part]) {
    return lineTiming;
  }

  return {
    ...lineTiming,
    partOverrides: {
      ...lineTiming.partOverrides,
      [part]: lineTiming.sharedEvents.map((event) => ({
        ...event,
        id: createTimingId("event"),
        scope: part,
      })),
    },
  };
}

export function resetPartOverride(lineTiming: LineTiming, part: VocalPart) {
  const remainingOverrides = { ...lineTiming.partOverrides };
  delete remainingOverrides[part];

  return {
    ...lineTiming,
    partOverrides: remainingOverrides,
  };
}

export function ensureTimingForSong(song: Song, settings = song.timingSettings) {
  const normalizedSettings = normalizeSettings(settings);
  const validLineIds = new Set(
    song.sections.flatMap((section) => section.lines.map((line) => line.id)),
  );
  const timingByLine = Object.fromEntries(
    Object.entries(song.timingByLine ?? {}).filter(([lineId]) => validLineIds.has(lineId)),
  );

  song.sections.forEach((section) => {
    section.lines.forEach((line) => {
      if (!timingByLine[line.id]) {
        timingByLine[line.id] = createDefaultTimingForLine(line, normalizedSettings, section.id);
      } else {
        timingByLine[line.id] = rebarLineTiming(timingByLine[line.id], normalizedSettings);
      }
    });
  });

  return {
    ...song,
    timingSettings: normalizedSettings,
    timingByLine,
  };
}

export function applyTimingSettingsToSong(song: Song, settings: SongTimingSettings) {
  const normalizedSettings = normalizeSettings(settings);

  return {
    ...song,
    timingSettings: normalizedSettings,
    timingByLine: Object.fromEntries(
      Object.entries(song.timingByLine ?? {}).map(([lineId, lineTiming]) => [
        lineId,
        rebarLineTiming(lineTiming, normalizedSettings),
      ]),
    ),
  };
}

export function migrateSongTiming(song: Song): Song {
  return {
    ...song,
    mode: song.mode ?? "simple",
    timingSettings: normalizeSettings(song.timingSettings),
    timingByLine: song.timingByLine ?? {},
  };
}

export function getEventAbsoluteStart(event: TimingEvent, bars: Bar[]) {
  return getAbsoluteStart(event, bars);
}
