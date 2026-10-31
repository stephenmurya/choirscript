"use client";

import type { Song, VocalPart, VoicePreset } from "@/lib/songTypes";
import { VOICE_PRESET_LABELS, VOICE_PRESET_PARTS } from "@/lib/songSelection";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const ALL_PARTS: VocalPart[] = ["soprano", "alto", "tenor", "bass"];

type SongSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song;
  onMetadataChange: (patch: Partial<Song>) => void;
  enabledParts: VocalPart[];
  onVoiceSettingsChange: (preset: VoicePreset, parts: VocalPart[]) => void;
};

/**
 * Song details and part setup moved out of the old left sidebar: the editor is
 * script + arrangement now, and everything that is not part of the writing
 * surface lives behind the settings icon in the header.
 */
export function SongSettingsDialog({
  open,
  onOpenChange,
  song,
  onMetadataChange,
  enabledParts,
  onVoiceSettingsChange,
}: SongSettingsDialogProps) {
  const preset = song.voicePreset ?? "custom";

  function choosePreset(nextPreset: VoicePreset) {
    onVoiceSettingsChange(
      nextPreset,
      nextPreset === "custom" ? enabledParts : VOICE_PRESET_PARTS[nextPreset],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel-scroll max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Song settings</DialogTitle>
          <DialogDescription>Details shown in the rehearsal view, and which voice parts this song uses.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Song</p>
            <Label className="block text-xs font-medium text-muted-foreground">
              Title
              <Input
                value={song.title ?? ""}
                onChange={(event) => onMetadataChange({ title: event.target.value })}
                className="mt-1.5"
              />
            </Label>
            <Label className="block text-xs font-medium text-muted-foreground">
              Artist / Singer
              <Input
                value={song.artist ?? ""}
                onChange={(event) => onMetadataChange({ artist: event.target.value })}
                className="mt-1.5"
              />
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Label className="block text-xs font-medium text-muted-foreground">
                Key
                <Input
                  value={song.key ?? ""}
                  onChange={(event) => onMetadataChange({ key: event.target.value })}
                  className="mt-1.5"
                />
              </Label>
              <Label className="block text-xs font-medium text-muted-foreground">
                BPM
                <Input
                  value={song.tempo ?? ""}
                  onChange={(event) => onMetadataChange({ tempo: event.target.value })}
                  className="mt-1.5"
                />
              </Label>
            </div>
            <Label className="block text-xs font-medium text-muted-foreground">
              Director notes
              <Textarea
                value={song.notes ?? ""}
                onChange={(event) => onMetadataChange({ notes: event.target.value })}
                rows={4}
                className="mt-1.5 resize-y"
              />
            </Label>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Part settings</p>
            <Label className="block text-xs font-medium text-muted-foreground">
              Voices
              <Select value={preset} onValueChange={(value) => choosePreset(value as VoicePreset)}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue>{VOICE_PRESET_LABELS[preset]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VOICE_PRESET_LABELS) as VoicePreset[]).map((value) => (
                    <SelectItem key={value} value={value}>{VOICE_PRESET_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
            <p className="text-xs leading-5 text-muted-foreground">
              Hidden voices keep their notation and can be restored later.
            </p>
            {preset === "custom" ? (
              <div className="space-y-2">
                {ALL_PARTS.map((part) => (
                  <label
                    key={part}
                    className="flex min-h-9 items-center justify-between rounded-md bg-muted/30 px-3 text-sm capitalize"
                  >
                    <span>{part}</span>
                    <Switch
                      checked={enabledParts.includes(part)}
                      onCheckedChange={(checked) =>
                        onVoiceSettingsChange(
                          "custom",
                          checked
                            ? [...new Set([...enabledParts, part])]
                            : enabledParts.filter((item) => item !== part),
                        )
                      }
                      aria-label={`Enable ${part}`}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
