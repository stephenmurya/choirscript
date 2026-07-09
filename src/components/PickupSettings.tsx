"use client";

import type { SongTimingSettings } from "@/lib/songTypes";
import { getPickupBeatOptions } from "@/lib/timing";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type PickupSettingsProps = {
  settings: SongTimingSettings;
  onChange: (settings: SongTimingSettings) => void;
};

export function PickupSettings({ settings, onChange }: PickupSettingsProps) {
  const pickupOptions = getPickupBeatOptions(settings);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="pickup-bar">Pickup bar</Label>
        <Switch
          id="pickup-bar"
          checked={settings.hasPickupBar}
          onCheckedChange={(checked) =>
            onChange({
              ...settings,
              hasPickupBar: checked,
              pickupBeats: checked ? settings.pickupBeats ?? pickupOptions[0] : undefined,
            })
          }
        />
      </div>
      {settings.hasPickupBar ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Pickup length
          <Select
            value={String(settings.pickupBeats ?? pickupOptions[0])}
            onValueChange={(value) => onChange({ ...settings, pickupBeats: Number(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pickupOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} {option === 1 ? "beat" : "beats"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
      ) : null}
    </div>
  );
}
