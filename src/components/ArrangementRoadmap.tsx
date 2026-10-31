"use client";

import { useEffect, useMemo, useState } from "react";
import { ListMusic } from "lucide-react";
import { resolveArrangement } from "@/lib/arrangement";
import type { Song } from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function useArrangementRows(song: Song) {
  return useMemo(() => resolveArrangement(song), [song]);
}

function ArrangementList({
  rows,
  activeId,
  onJump,
}: {
  rows: ReturnType<typeof resolveArrangement>;
  activeId: string;
  onJump: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No sections yet.</p>;
  }

  return (
    <ol className="space-y-1" aria-label="Rehearsal arrangement">
      {rows.map(({ occurrence, section, repeatIndex, renderIdentity }, index) => {
        const id = `rehearsal-${renderIdentity}`;
        const label = repeatIndex > 0 ? `${section.name} · repeat ${repeatIndex + 1}` : section.name;
        const performer = occurrence.performer ?? "";
        const melody = occurrence.voicing === "melody";
        const active = activeId === id;

        return (
          <li key={renderIdentity}>
            <Button
              type="button"
              variant="ghost"
              className={`h-auto min-h-8 w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
                active ? "bg-primary/10 text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => onJump(id)}
            >
              <span className="w-4 shrink-0 text-[11px] tabular-nums">{index + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium">{label}</span>
                  {melody ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.06em] text-emerald-300">
                      Melody
                    </span>
                  ) : null}
                </span>
                {performer ? (
                  <span className="truncate text-[10px] uppercase tracking-[0.08em] text-primary/80">
                    {performer}
                  </span>
                ) : null}
              </span>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Scroll-spy: watch every rendered section and keep the list in step with what
 * the singer is looking at.
 */
function useActiveSection(rows: ReturnType<typeof resolveArrangement>) {
  const [activeId, setActiveId] = useState(rows[0] ? `rehearsal-${rows[0].renderIdentity}` : "");

  useEffect(() => {
    const sections = rows
      .map((row) => document.getElementById(`rehearsal-${row.renderIdentity}`))
      .filter(Boolean) as HTMLElement[];

    if (sections.length === 0) {
      return;
    }

    // rootMargin only accepts px and %: rem/em throw a SyntaxError, which
    // escaped the effect and replaced the whole rehearsal view with the
    // "This page couldn't load" error boundary. Keep px here and never let
    // the scroll-spy take the document down with it.
    let observer: IntersectionObserver;

    try {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (visible[0]?.target.id) {
            setActiveId(visible[0].target.id);
          }
        },
        { rootMargin: "-80px 0px -65% 0px", threshold: [0, 0.1, 0.5] },
      );
    } catch {
      return;
    }

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [rows]);

  return [activeId, setActiveId] as const;
}

/** Desktop sidebar: pinned to the right edge of the page, scrolls on its own. */
export function ArrangementRoadmap({ song }: { song: Song }) {
  const rows = useArrangementRows(song);
  const [activeId, setActiveId] = useActiveSection(rows);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  return (
    <aside className="panel-scroll no-print hidden self-start border-l border-border/60 py-6 pl-4 lg:sticky lg:top-[4.75rem] lg:block lg:max-h-[calc(100svh-5.25rem)] lg:overflow-y-auto">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Arrangement</p>
          <p className="mt-1 text-xs text-muted-foreground">Performance order</p>
        </div>
        <ArrangementList rows={rows} activeId={activeId} onJump={jumpTo} />
      </div>
    </aside>
  );
}

/**
 * Mobile: the arrangement belongs at the top of the rehearsal view, not after
 * however many screens of lyrics the singer has to scroll through first.
 */
export function ArrangementMobileBar({ song }: { song: Song }) {
  const rows = useArrangementRows(song);
  const [activeId, setActiveId] = useActiveSection(rows);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  return (
    <div className="no-print mb-4 lg:hidden">
      <Sheet>
        <SheetTrigger render={<Button type="button" variant="outline" className="w-full justify-between" />}>
          <span className="flex items-center gap-2">
            <ListMusic className="size-4" />
            Arrangement
          </span>
          <span className="text-xs text-muted-foreground">{rows.length} sections</span>
        </SheetTrigger>
        <SheetContent side="right" className="panel-scroll w-[min(92vw,24rem)] overflow-y-auto p-5">
          <SheetHeader className="p-0 pb-5">
            <SheetTitle>Arrangement</SheetTitle>
            <SheetDescription>Jump through the performance order.</SheetDescription>
          </SheetHeader>
          <ArrangementList rows={rows} activeId={activeId} onJump={jumpTo} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
