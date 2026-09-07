import { getTechniqueById } from "@/lib/defaultTechniques";
import type { Song } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";

type TechniqueLegendProps = {
  song: Song;
  compact?: boolean;
};

export function TechniqueLegend({ song, compact = false }: TechniqueLegendProps) {
  const usedIds = new Set<string>();
  song.source.sections.forEach((section) => section.lines.forEach((line) => {
    line.annotations.forEach((annotation) => usedIds.add(annotation.techniqueId));
    line.words.forEach((word) => word.syllables.forEach((syllable) => syllable.techniques.forEach((technique) => usedIds.add(technique.techniqueId))));
  }));
  const techniques = [...usedIds].map(getTechniqueById).filter(Boolean);

  if (techniques.length === 0) return null;

  return (
    <details className="technique-legend rounded-2xl border border-border bg-muted/20 p-4" open={!compact}>
      <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Technique legend <span className="ml-1 text-xs font-normal normal-case">({techniques.length})</span></summary>
      <div className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"}>
        {techniques.map((technique) => technique ? <div key={technique.id} className="rounded-md border border-border/80 bg-background/60 px-3 py-2 text-sm text-foreground" title={`${technique.name}: ${technique.description}`}><TechniqueBadge technique={technique} compact={compact} className="border-0 bg-transparent p-0" />{!compact ? <p className="mt-1 text-xs opacity-85">{technique.description}</p> : null}</div> : null)}
      </div>
    </details>
  );
}
