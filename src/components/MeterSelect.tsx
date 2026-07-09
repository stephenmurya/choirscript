"use client";

import type { MeterPreset } from "@/lib/songTypes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MeterSelectProps = {
  value: MeterPreset;
  onChange: (value: MeterPreset) => void;
};

export function MeterSelect({ value, onChange }: MeterSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as MeterPreset)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="4/4">4/4</SelectItem>
          <SelectItem value="3/4">3/4</SelectItem>
          <SelectItem value="6/8">6/8</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
