export type AppliedTechnique = {
  techniqueId: string;
  intensity?: string;
  note?: string;
};

export type Technique = {
  id: string;
  name: string;
  symbol: string;
  colorClass: string;
  highlightClass: string;
  swatchClass: string;
  borderClass: string;
  description: string;
};

export type VoicePart = "all" | "soprano" | "alto" | "tenor" | "bass";

export type SongMode = "simple" | "advanced";

export type MeterPreset = "4/4" | "3/4" | "6/8" | "custom";

export type TimingSubdivision = "beat" | "half-beat";

export type VocalPart = "soprano" | "alto" | "tenor" | "bass";

export type TimingScope = "shared" | VocalPart;

export type SongTimingSettings = {
  meterPreset: MeterPreset;
  beatsPerBar: number;
  beatUnit: number;
  subdivision: TimingSubdivision;
  hasPickupBar: boolean;
  pickupBeats?: number;
};

export type TimingEventType = "syllable" | "hold" | "rest" | "break";

export type TimingEvent = {
  id: string;
  type: TimingEventType;
  syllableId?: string;
  sectionId: string;
  lineId: string;
  barId: string;
  scope: TimingScope;
  startUnit: number;
  durationUnits: number;
  label?: string;
  note?: string;
};

export type Bar = {
  id: string;
  sectionId: string;
  lineId: string;
  index: number;
  isPickup?: boolean;
  beats: number;
  beatUnit: number;
  subdivision: TimingSubdivision;
};

export type LineTiming = {
  lineId: string;
  bars: Bar[];
  sharedEvents: TimingEvent[];
  partOverrides: Partial<Record<VocalPart, TimingEvent[]>>;
};

export type TechniqueAnnotation = {
  id: string;
  techniqueId: string;
  syllableIds: string[];
  appliesTo: VoicePart[];
  note?: string;
  label?: string;
  createdAt: string;
};

export type SyllableToken = {
  id: string;
  text: string;
  soprano: string;
  alto: string;
  tenor: string;
  bass?: string;
  techniques: AppliedTechnique[];
  directorNote?: string;
};

export type WordToken = {
  id: string;
  originalWord: string;
  syllables: SyllableToken[];
};

export type SongLine = {
  id: string;
  words: WordToken[];
  annotations: TechniqueAnnotation[];
};

export type SongSection = {
  id: string;
  name: string;
  lines: SongLine[];
};

export type Song = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: string;
  notes?: string;
  mode: SongMode;
  sections: SongSection[];
  timingSettings: SongTimingSettings;
  timingByLine: Record<string, LineTiming>;
  createdAt: string;
  updatedAt: string;
};

export type SharedSongPayload = {
  schemaVersion: 1;
  shareId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: string;
  song: Song;
};

export type PartKey = "soprano" | "alto" | "tenor" | "bass";

export type LyricSelection = {
  sectionId: string;
  lineId: string;
  startSyllableId: string;
  endSyllableId: string;
  selectedSyllableIds: string[];
} | null;
