import { getActiveArrangement, normalizeRepeatCount } from "@/lib/arrangement";
import type { Song } from "@/lib/songTypes";

export function ArrangementRoadmap({ song }: { song: Song }) {
  const arrangement = getActiveArrangement(song);
  const rows = arrangement?.occurrences.flatMap((occurrence) => {
    const section = song.source.sections.find((candidate) => candidate.id === occurrence.sourceSectionId);
    return section ? [{ occurrence, section }] : [];
  }) ?? [];

  const content = (
    <div className="space-y-2">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Roadmap</p><p className="mt-1 text-xs text-muted-foreground">Performance order</p></div>
      {rows.length ? <ol className="space-y-1.5">{rows.map(({ occurrence, section }, index) => { const repeatCount = normalizeRepeatCount(occurrence.repeatCount); return <li key={occurrence.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2 text-sm"><span className="w-4 text-[11px] text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{section.name}</span>{repeatCount > 1 ? <span className="text-xs text-muted-foreground">×{repeatCount}</span> : null}</li>; })}</ol> : <p className="text-xs text-muted-foreground">Source order</p>}
    </div>
  );

  return <><details className="no-print mb-5 rounded-xl border border-border bg-card p-3 lg:hidden"><summary className="cursor-pointer list-none text-sm font-semibold">Arrangement roadmap</summary><div className="pt-3">{content}</div></details><aside className="no-print hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">{content}</aside></>;
}
