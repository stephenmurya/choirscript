"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { Song } from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import { SlashCommandLine } from "./SlashCommandLine";

type PlainLyricsEditorProps = {
  song: Song;
  focusedSectionId: string | null;
  onSectionFocusHandled: () => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreateSectionAfter: (sectionId: string | null, name?: string) => void;
  onAddLine: (sectionId: string, text: string) => void;
  onUpdateLineText: (sectionId: string, lineId: string, text: string) => void;
  onInsertLyrics: (sectionId: string, lineId: string, text: string) => void;
  onCreateLineAfter: (sectionId: string, lineId: string) => string;
  onDeleteLine: (sectionId: string, lineId: string) => string | null;
  onDuplicateLine: (sectionId: string, lineId: string) => void;
};

function lineText(line: Song["source"]["sections"][number]["lines"][number]) {
  return line.words.map((word) => word.originalWord).join(" ");
}

export function PlainLyricsEditor({
  song,
  focusedSectionId,
  onSectionFocusHandled,
  onRenameSection,
  onDeleteSection,
  onCreateSectionAfter,
  onAddLine,
  onUpdateLineText,
  onInsertLyrics,
  onCreateLineAfter,
  onDeleteLine,
  onDuplicateLine,
}: PlainLyricsEditorProps) {
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const sectionTitleRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusedSectionId) return;
    const input = sectionTitleRefs.current.get(focusedSectionId);
    if (input) {
      input.focus();
      input.select();
      onSectionFocusHandled();
    }
  }, [focusedSectionId, onSectionFocusHandled]);

  useEffect(() => {
    if (!focusLineId) return;
    const input = document.querySelector<HTMLInputElement>(`[data-plain-line="${focusLineId}"]`);
    if (input) {
      input.focus();
      input.select();
      setFocusLineId(null);
    }
  }, [focusLineId, song]);

  function createNextLine(sectionId: string, lineId: string) {
    setFocusLineId(onCreateLineAfter(sectionId, lineId));
  }

  return (
    <section className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-7 sm:py-10 lg:px-10">
      <header className="mb-12">
        <input aria-label="Song title" value={song.title} readOnly className="document-title-input w-full min-w-0 bg-transparent text-foreground outline-none" />
        <p className="mt-2 text-sm text-muted-foreground">Lyrics document</p>
      </header>

      <div className="space-y-12">
        {song.source.sections.map((section) => (
          <section key={section.id} id={`source-${section.id}`} className="group/section">
            <div className="mb-4 flex items-center gap-2">
              <input
                ref={(node) => {
                  if (node) sectionTitleRefs.current.set(section.id, node);
                  else sectionTitleRefs.current.delete(section.id);
                }}
                aria-label={`Section heading ${section.name}`}
                value={section.name}
                onChange={(event) => onRenameSection(section.id, event.target.value)}
                onBlur={(event) => { if (!event.target.value.trim()) onRenameSection(section.id, "New Section"); }}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-xl font-semibold tracking-tight text-foreground outline-none transition hover:bg-muted/30 focus:border-border focus:bg-muted/30"
              />
              <Button type="button" variant="ghost" size="icon-sm" className="no-print opacity-60 transition sm:opacity-0 sm:group-hover/section:opacity-100" onClick={() => onCreateSectionAfter(section.id)} aria-label={`Add section after ${section.name}`}><Plus /></Button>
              <Button type="button" variant="ghost" size="icon-sm" className="no-print opacity-60 transition sm:opacity-0 sm:group-hover/section:opacity-100" onClick={() => onDeleteSection(section.id)} aria-label={`Delete ${section.name}`}><MoreHorizontal /></Button>
            </div>

            <div className="space-y-1">
              {section.lines.map((line, lineIndex) => (
                <div key={line.id} className="group/line flex items-center gap-2">
                  <input
                    data-plain-line={line.id}
                    aria-label={`Lyric line ${lineIndex + 1}`}
                    value={lineText(line)}
                    onChange={(event) => onUpdateLineText(section.id, line.id, event.target.value)}
                    onPaste={(event) => {
                      const text = event.clipboardData.getData("text");
                      if (text.includes("\n") || text.includes("\r")) {
                        event.preventDefault();
                        onInsertLyrics(section.id, line.id, text);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        createNextLine(section.id, line.id);
                      } else if (event.key === "Backspace" && !lineText(line) && lineIndex > 0) {
                        event.preventDefault();
                        setFocusLineId(onDeleteLine(section.id, line.id));
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-[1.05rem] leading-7 text-foreground outline-none transition placeholder:text-muted-foreground hover:bg-muted/20 focus:border-border focus:bg-muted/20"
                    placeholder={lineIndex === 0 ? "Type lyrics…" : "Continue the line…"}
                  />
                  <div className="no-print flex shrink-0 items-center gap-0.5 opacity-60 sm:opacity-0 sm:transition sm:group-hover/line:opacity-100">
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDuplicateLine(section.id, line.id)} aria-label="Duplicate line"><Copy /></Button>
                    <Button type="button" variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => { setFocusLineId(onDeleteLine(section.id, line.id)); }} aria-label="Delete line"><Trash2 /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pl-1">
              <SlashCommandLine onCreateLine={(text) => onAddLine(section.id, text)} onCreateSection={(name) => onCreateSectionAfter(section.id, name)} />
            </div>
          </section>
        ))}

        {song.source.sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-2 py-4">
            <SlashCommandLine onCreateLine={(text) => onAddLine("", text)} onCreateSection={(name) => onCreateSectionAfter(null, name)} />
            <p className="mt-2 px-1 text-xs text-muted-foreground">Type a lyric line, press Enter, or use / for commands.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
