"use client";

import { Settings2 } from "lucide-react";
import type { Song, SongMode } from "@/lib/songTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { LyricsImporter } from "./LyricsImporter";
import { ModeToggle } from "./ModeToggle";

type EditorInspectorProps = {
  song: Song;
  view: "lyrics" | "parts";
  includeBass: boolean;
  onMetadataChange: (patch: Partial<Song>) => void;
  onGenerateScript: (lyrics: string) => void;
  onBassEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: SongMode) => void;
};

function InspectorContent({ song, view, includeBass, onMetadataChange, onGenerateScript, onBassEnabledChange, onModeChange }: EditorInspectorProps) {
  return <div className="space-y-7">
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Song</p>
      <div className="mt-3 space-y-3">
        <Label className="block text-xs font-medium text-muted-foreground">Artist<Input value={song.artist ?? ""} onChange={(event) => onMetadataChange({ artist: event.target.value })} className="mt-1.5" /></Label>
        <div className="grid grid-cols-2 gap-2"><Label className="block text-xs font-medium text-muted-foreground">Key<Input value={song.key ?? ""} onChange={(event) => onMetadataChange({ key: event.target.value })} className="mt-1.5" /></Label><Label className="block text-xs font-medium text-muted-foreground">BPM<Input value={song.tempo ?? ""} onChange={(event) => onMetadataChange({ tempo: event.target.value })} className="mt-1.5" /></Label></div>
        <Label className="block text-xs font-medium text-muted-foreground">Director notes<Textarea value={song.notes ?? ""} onChange={(event) => onMetadataChange({ notes: event.target.value })} rows={4} className="mt-1.5 resize-y" /></Label>
      </div>
    </section>

    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Import</p>
      <div className="mt-3"><LyricsImporter onGenerate={onGenerateScript} /></div>
    </section>

    {view === "parts" ? <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Parts settings</p>
      <div className="mt-3 space-y-4">
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Voice parts</p><div className="space-y-1.5 text-sm"><div className="rounded-md bg-muted/30 px-3 py-2">Soprano</div><div className="rounded-md bg-muted/30 px-3 py-2">Alto</div><div className="rounded-md bg-muted/30 px-3 py-2">Tenor</div>{includeBass ? <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">Bass<Button type="button" variant="ghost" size="xs" className="ml-auto text-xs" onClick={() => onBassEnabledChange(false)}>Remove</Button></div> : <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onBassEnabledChange(true)}>+ Add Bass</Button>}</div></div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Editing mode</p><ModeToggle mode={song.mode} onModeChange={onModeChange} /></div>
      </div>
    </section> : null}
  </div>;
}

export function EditorInspector(props: EditorInspectorProps) {
  return <>
    <div className="no-print mb-4 lg:hidden"><Sheet><SheetTrigger render={<Button type="button" variant="outline" className="w-full justify-start gap-2" />}><Settings2 />Editor settings</SheetTrigger><SheetContent side="left" className="w-[min(88vw,22rem)] overflow-y-auto p-5"><SheetHeader className="p-0 pb-6"><SheetTitle>Editor settings</SheetTitle><SheetDescription>Song details, import, and voice setup.</SheetDescription></SheetHeader><InspectorContent {...props} /></SheetContent></Sheet></div>
    <aside className="no-print hidden min-w-0 self-start border-r border-border/70 pr-5 lg:sticky lg:top-20 lg:order-0 lg:block lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto"><InspectorContent {...props} /></aside>
  </>;
}
