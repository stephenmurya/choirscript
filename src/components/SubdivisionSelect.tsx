"use client";

import type { TimingSubdivision } from "@/lib/songTypes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SubdivisionSelectProps = {
  value: TimingSubdivision;
  onChange: (value: TimingSubdivision) => void;
};

export function SubdivisionSelect({ value, onChange }: SubdivisionSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as TimingSubdivision)}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="beat">Beat</SelectItem>
          <SelectItem value="half-beat">Half-beat</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
