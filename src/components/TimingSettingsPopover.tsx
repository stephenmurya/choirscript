"use client";

import type { SongTimingSettings } from "@/lib/songTypes";
import { getUnitsPerBar } from "@/lib/timing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MeterSelect } from "./MeterSelect";
import { PickupSettings } from "./PickupSettings";
import { SubdivisionSelect } from "./SubdivisionSelect";

type TimingSettingsPopoverProps = {
  settings: SongTimingSettings;
  onChange: (settings: SongTimingSettings) => void;
};

function settingsForMeter(settings: SongTimingSettings, meter: SongTimingSettings["meterPreset"]) {
  if (meter === "3/4") {
    return { ...settings, meterPreset: meter, beatsPerBar: 3, beatUnit: 4 };
  }

  if (meter === "6/8") {
    return { ...settings, meterPreset: meter, beatsPerBar: 6, beatUnit: 8 };
  }

  if (meter === "4/4") {
    return { ...settings, meterPreset: meter, beatsPerBar: 4, beatUnit: 4 };
  }

  return { ...settings, meterPreset: meter };
}

export function TimingSettingsPopover({ settings, onChange }: TimingSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        Timing settings
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))]" align="start">
        <PopoverHeader>
          <PopoverTitle>Advanced timing</PopoverTitle>
          <PopoverDescription>
            Optional count grid for bars, holds, rests, breaks, and pickup timing.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Meter
            <MeterSelect
              value={settings.meterPreset}
              onChange={(meter) => onChange(settingsForMeter(settings, meter))}
            />
          </label>

          {settings.meterPreset === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Beats
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={settings.beatsPerBar}
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      beatsPerBar: Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Beat unit
                <Select
                  value={String(settings.beatUnit)}
                  onValueChange={(value) => onChange({ ...settings, beatUnit: Number(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[2, 4, 8, 16].map((unit) => (
                        <SelectItem key={unit} value={String(unit)}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Subdivision
            <SubdivisionSelect
              value={settings.subdivision}
              onChange={(subdivision) => onChange({ ...settings, subdivision })}
            />
          </label>

          <Separator />
          <PickupSettings settings={settings} onChange={onChange} />
          <Separator />

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <Label>Units per bar</Label>
            <Badge variant="outline">{getUnitsPerBar(settings)}</Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
