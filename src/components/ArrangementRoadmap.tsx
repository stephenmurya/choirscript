"use client";

import { useEffect, useMemo, useState } from "react";
import { ListMusic } from "lucide-react";
import { resolveArrangement } from "@/lib/arrangement";
import type { Song } from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function ArrangementRoadmap({ song }: { song: Song }) {
  const rows = useMemo(() => resolveArrangement(song), [song]);
  const [activeId, setActiveId] = useState(rows[0] ? `rehearsal-${rows[0].renderIdentity}` : "");

  useEffect(() => {
    const sections = rows
      .map((row) => document.getElementById(`rehearsal-${row.renderIdentity}`))
      .filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    // rootMargin only accepts px and %: rem/em throw a SyntaxError, which
    // escaped the effect and replaced the whole rehearsal view with the
    // "This page couldn't load" error boundary. Keep px here and never let
    // the scroll-spy take the document down with it.
    let observer: IntersectionObserver;

    try {
      observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      }, { rootMargin: "-80px 0px -65% 0px", threshold: [0, 0.1, 0.5] });
    } catch {
      return;
    }

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [rows]);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  const content = <div className="space-y-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Roadmap</p><p className="mt-1 text-xs text-muted-foreground">Performance order</p></div>{rows.length ? <ol className="space-y-1.5" aria-label="Rehearsal roadmap">{rows.map(({ section, repeatIndex, renderIdentity }, index) => { const id = `rehearsal-${renderIdentity}`; const label = repeatIndex > 0 ? `${section.name} · repeat ${repeatIndex + 1}` : section.name; return <li key={renderIdentity}><Button type="button" variant="ghost" className={`h-auto min-h-9 w-full justify-start gap-2 px-2.5 py-2 text-left text-sm ${activeId === id ? "bg-primary/10 text-foreground" : "text-muted-foreground"}`} onClick={() => jumpTo(id)}><span className="w-5 shrink-0 text-[11px]">{index + 1}</span><span className="min-w-0 truncate font-medium">{label}</span></Button></li>; })}</ol> : <p className="text-xs text-muted-foreground">No sections yet.</p>}</div>;

  return <><div className="no-print mb-5 lg:hidden"><Sheet><SheetTrigger render={<Button type="button" variant="outline" className="w-full justify-between" />}><span className="flex items-center gap-2"><ListMusic className="size-4" />Roadmap</span><span className="text-xs text-muted-foreground">{rows.length} sections</span></SheetTrigger><SheetContent side="right" className="w-[min(92vw,24rem)] overflow-y-auto p-5"><SheetHeader className="p-0 pb-5"><SheetTitle>Rehearsal roadmap</SheetTitle><SheetDescription>Jump through the performance order.</SheetDescription></SheetHeader>{content}</SheetContent></Sheet></div><aside className="no-print hidden self-start lg:sticky lg:top-[4.75rem] lg:block lg:max-h-[calc(100svh-5.25rem)] lg:overflow-y-auto">{content}</aside></>;
}
