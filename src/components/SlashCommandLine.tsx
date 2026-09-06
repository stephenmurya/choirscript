"use client";

import { useEffect, useRef, useState } from "react";
import { SlashCommandMenu, type SlashCommand } from "./SlashCommandMenu";
import { rankSlashCommands } from "@/lib/slashCommands";

type SlashCommandLineProps = {
  placeholder?: string;
  onCreateSection: (name?: string) => void;
  onCreateLine?: (lyrics: string) => void;
  onDuplicateLine?: () => void;
};

export function SlashCommandLine({
  placeholder = "Start typing or '/' for menu",
  onCreateSection,
  onCreateLine,
  onDuplicateLine,
}: SlashCommandLineProps) {
  const [value, setValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        inputRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const commands: SlashCommand[] = [
    {
      id: "create-section",
      label: "Create new section",
      description: "Add a new song section",
      keywords: ["section", "new", "add"],
      action: () => {
        setIsMenuOpen(false);
        setValue("");
        onCreateSection();
      },
    },
    ...["Verse", "Chorus", "Bridge", "Interlude", "Intro", "Outro"].map((name) => ({
      id: `section-${name.toLowerCase()}`,
      label: name,
      description: `Add a ${name.toLowerCase()} section`,
      keywords: [name.toLowerCase(), "section", "add"],
      action: () => {
        setIsMenuOpen(false);
        setValue("");
        onCreateSection(name);
      },
    })),
    ...(onDuplicateLine ? [{
      id: "duplicate-line",
      label: "Duplicate line",
      description: "Copy the selected line below itself",
      keywords: ["duplicate", "copy", "line"],
      aliases: ["dup"],
      action: () => {
        setIsMenuOpen(false);
        setValue("");
        onDuplicateLine();
      },
    }] : []),
  ];
  const filteredCommands = rankSlashCommands(commands, value.slice(1));

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          setActiveIndex(0);
          setIsMenuOpen(nextValue.startsWith("/"));
        }}
        onPaste={(event) => {
          const pastedText = event.clipboardData.getData("text");
          if (pastedText.includes("\n") || pastedText.includes("\r")) {
            event.preventDefault();
            onCreateLine?.(pastedText);
            setValue("");
            setIsMenuOpen(false);
          }
        }}
        onFocus={() => {
          if (value === "/") {
            setIsMenuOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (isMenuOpen && event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, Math.max(filteredCommands.length - 1, 0)));
            return;
          }
          if (isMenuOpen && event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }
          if (event.key === "/") {
            setIsMenuOpen(true);
            return;
          }

          if (event.key === "Escape" && isMenuOpen) {
            event.preventDefault();
            setIsMenuOpen(false);
            return;
          }

          if (event.key === "Enter" && value.trim() && value.trim() !== "/") {
            event.preventDefault();
            if (isMenuOpen) {
              filteredCommands[activeIndex]?.action();
              return;
            }
            onCreateLine?.(value.trim());
            setValue("");
          }
        }}
        className="h-11 w-full rounded-xl border border-transparent bg-transparent px-1 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-border focus:bg-muted/30 focus:px-3 focus:shadow-sm"
      />
      {isMenuOpen ? (
        <SlashCommandMenu
          commands={filteredCommands}
          activeIndex={Math.min(activeIndex, Math.max(filteredCommands.length - 1, 0))}
          onActiveIndexChange={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
