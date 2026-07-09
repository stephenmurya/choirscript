"use client";

import { DEFAULT_TECHNIQUES } from "@/lib/defaultTechniques";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TechniqueBadge } from "./TechniqueBadge";

type TechniqueContextMenuProps = {
  position: { x: number; y: number } | null;
  onApplyTechnique: (techniqueId: string) => void;
};

export function TechniqueContextMenu({
  position,
  onApplyTechnique,
}: TechniqueContextMenuProps) {
  if (!position) {
    return null;
  }

  return (
    <div
      data-technique-menu="true"
      className="fixed z-50 w-[min(20rem,calc(100vw-1rem))] rounded-4xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Apply technique"
    >
      <Command>
        <CommandInput placeholder="Search techniques..." />
        <CommandList>
          <CommandEmpty>No technique found.</CommandEmpty>
          <CommandGroup heading="Apply technique">
            {DEFAULT_TECHNIQUES.map((technique) => (
              <CommandItem
                key={technique.id}
                value={`${technique.name} ${technique.symbol}`}
                onSelect={() => onApplyTechnique(technique.id)}
                className="min-h-11"
              >
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${technique.swatchClass}`}
                />
                <TechniqueBadge technique={technique} compact />
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {technique.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
