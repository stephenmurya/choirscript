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
  sections: SongSection[];
  createdAt: string;
  updatedAt: string;
};

export type PartKey = "soprano" | "alto" | "tenor" | "bass";

export type LyricSelection = {
  sectionId: string;
  lineId: string;
  startSyllableId: string;
  endSyllableId: string;
  selectedSyllableIds: string[];
} | null;
