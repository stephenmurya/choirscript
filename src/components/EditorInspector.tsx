"use client";

import { PanelLeftClose, PanelLeftOpen, Settings2 } from "lucide-react";
import type { Song, SongMode, VocalPart, VoicePreset } from "@/lib/songTypes";
import { VOICE_PRESET_LABELS, VOICE_PRESET_PARTS } from "@/lib/songSelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LyricsImporter } from "./LyricsImporter";
import { ModeToggle } from "./ModeToggle";

type EditorInspectorProps = {
  song: Song;
  view: "lyrics" | "parts";
  onMetadataChange: (patch: Partial<Song>) => void;
  onReviewImport: (lyrics: string) => void;
  onModeChange: (mode: SongMode) => void;
  enabledParts: VocalPart[];
  onVoiceSettingsChange: (preset: VoicePreset, parts: VocalPart[]) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function InspectorContent({ song, view, onMetadataChange, onReviewImport, onModeChange, enabledParts, onVoiceSettingsChange }: EditorInspectorProps) {
  const preset = song.voicePreset ?? "custom";
  const customParts: VocalPart[] = ["soprano", "alto", "tenor", "bass"];

  function choosePreset(nextPreset: VoicePreset) {
    onVoiceSettingsChange(nextPreset, nextPreset === "custom" ? enabledParts : VOICE_PRESET_PARTS[nextPreset]);
  }

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
      <div className="mt-3"><LyricsImporter onReview={onReviewImport} /></div>
    </section>

    {view === "parts" ? <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Parts settings</p>
      <div className="mt-3 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Voices</p>
          <Select value={preset} onValueChange={(value) => choosePreset(value as VoicePreset)}>
            <SelectTrigger className="w-full"><SelectValue>{VOICE_PRESET_LABELS[preset]}</SelectValue></SelectTrigger>
            <SelectContent>{(Object.keys(VOICE_PRESET_LABELS) as VoicePreset[]).map((value) => <SelectItem key={value} value={value}>{VOICE_PRESET_LABELS[value]}</SelectItem>)}</SelectContent>
          </Select>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Hidden voices keep their notation and can be restored later.</p>
          {preset === "custom" ? <div className="mt-3 space-y-2">{customParts.map((part) => <label key={part} className="flex min-h-9 items-center justify-between rounded-md bg-muted/30 px-3 text-sm capitalize"><span>{part}</span><Switch checked={enabledParts.includes(part)} onCheckedChange={(checked) => onVoiceSettingsChange("custom", checked ? [...new Set([...enabledParts, part])] : enabledParts.filter((item) => item !== part))} aria-label={`Enable ${part}`} /></label>)}</div> : null}
        </div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Editing mode</p><ModeToggle mode={song.mode} onModeChange={onModeChange} /></div>
      </div>
    </section> : null}
  </div>;
}

export function EditorInspector(props: EditorInspectorProps) {
  return <>
    <div className="no-print mb-4 xl:hidden"><Sheet><SheetTrigger render={<Button type="button" variant="outline" className="w-full justify-start gap-2" />}><Settings2 />Editor settings</SheetTrigger><SheetContent side="left" className="w-[min(88vw,22rem)] overflow-y-auto p-5"><SheetHeader className="p-0 pb-6"><SheetTitle>Editor settings</SheetTitle><SheetDescription>Song details, import, and voice setup.</SheetDescription></SheetHeader><InspectorContent {...props} /></SheetContent></Sheet></div>
    <aside className={`no-print hidden min-w-0 self-start border-r border-border/70 pr-5 xl:sticky xl:top-20 xl:order-0 xl:block xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto ${props.collapsed ? "xl:w-12 xl:pr-0" : ""}`}>
      <Button type="button" variant="ghost" size="icon-sm" className="mb-4" onClick={() => props.onCollapsedChange(!props.collapsed)} aria-label={props.collapsed ? "Expand song details" : "Collapse song details"} title={props.collapsed ? "Expand song details" : "Collapse song details"}>{props.collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
      {props.collapsed ? <span className="sr-only">Song details collapsed</span> : <InspectorContent {...props} />}
    </aside>
  </>;
}
