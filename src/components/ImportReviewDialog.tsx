"use client";

import { useMemo, useState } from "react";
import { findSuspiciousLyricsLines, parseLyricsInput } from "@/lib/lyricsParser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ImportReviewDialogProps = {
  open: boolean;
  text: string;
  onOpenChange: (open: boolean) => void;
  onApply: (text: string, mode: "replace" | "append") => void;
};

export function ImportReviewDialog({ open, text, onOpenChange, onApply }: ImportReviewDialogProps) {
  const [draft, setDraft] = useState(text);
  const parsed = useMemo(() => parseLyricsInput(draft), [draft]);
  const suspicious = useMemo(() => findSuspiciousLyricsLines(draft), [draft]);
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    parsed.sections.forEach((section) => {
      if (section.heading) counts.set(section.heading.toLowerCase(), (counts.get(section.heading.toLowerCase()) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  }, [parsed.sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review lyric import</DialogTitle>
          <DialogDescription>Check section boundaries and flagged lines before adding anything to this song.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          <label className="block text-sm font-medium text-foreground">Edit imported text before applying<Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} className="mt-2 resize-y font-mono text-xs leading-5" /></label>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <p className="font-medium text-foreground">{parsed.sections.length} section{parsed.sections.length === 1 ? "" : "s"} detected</p>
            <p className="mt-1 text-xs text-muted-foreground">Line breaks are preserved. Duplicate section names are kept as separate sections.</p>
          </div>
          {suspicious.length > 0 ? (
            <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <h3 className="text-sm font-semibold text-foreground">Review flagged lines</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {suspicious.map((line, index) => <li key={`${line.text}-${index}`}><span className="font-medium">{line.reason}:</span> {line.text}</li>)}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Nothing is removed automatically. Exclude uncertain lines by editing the pasted text before reviewing again.</p>
            </section>
          ) : null}
          <div className="space-y-3">
            {parsed.sections.map((section, index) => {
              const heading = section.heading ?? `Imported section ${index + 1}`;
              const duplicate = section.heading && duplicateNames.has(section.heading.toLowerCase());
              return <section key={`${heading}-${index}`} className="border-b border-border/70 pb-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{heading}</h3>{duplicate ? <span className="text-xs text-amber-700 dark:text-amber-300">Duplicate name</span> : null}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{section.lines.join("\n")}</p>
              </section>;
            })}
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={() => onApply(draft, "append")}>Append to song</Button><Button type="button" onClick={() => onApply(draft, "replace")}>Replace song</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
