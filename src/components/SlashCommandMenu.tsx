"use client";

import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

export type SlashCommand = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
};

type SlashCommandMenuProps = {
  commands: SlashCommand[];
};

export function SlashCommandMenu({ commands }: SlashCommandMenuProps) {
  return (
    <div
      data-slash-menu="true"
      className="absolute left-0 top-10 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-4xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
      role="menu"
      aria-label="Slash commands"
    >
      <Command>
        <CommandList>
          <CommandGroup heading="Commands">
            {commands.map((command) => (
              <CommandItem
                key={command.id}
                value={command.label}
                onSelect={command.action}
                className="flex-col items-start gap-1"
              >
                <span className="text-sm font-medium">{command.label}</span>
                {command.description ? (
                  <span className="text-xs text-muted-foreground">{command.description}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
