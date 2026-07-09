"use client";

import type { SongMode } from "@/lib/songTypes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ModeToggleProps = {
  mode: SongMode;
  onModeChange: (mode: SongMode) => void;
};

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <ToggleGroup
      value={[mode]}
      onValueChange={(value) => {
        const nextMode = value[0];

        if (nextMode) {
          onModeChange(nextMode as SongMode);
        }
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className="no-print"
    >
      <ToggleGroupItem value="simple">Simple</ToggleGroupItem>
      <ToggleGroupItem value="advanced">Advanced Timing</ToggleGroupItem>
    </ToggleGroup>
  );
}
