"use client";

import { useEffect, useRef, useState } from "react";
import { SlashCommandMenu, type SlashCommand } from "./SlashCommandMenu";

type SlashCommandLineProps = {
  placeholder?: string;
  onCreateSection: () => void;
  onCreateLine?: (lyrics: string) => void;
};

export function SlashCommandLine({
  placeholder = "Start typing or '/' for menu",
  onCreateSection,
  onCreateLine,
}: SlashCommandLineProps) {
  const [value, setValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      action: () => {
        setIsMenuOpen(false);
        setValue("");
        onCreateSection();
      },
    },
  ];

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
          setIsMenuOpen(nextValue === "/");
        }}
        onFocus={() => {
          if (value === "/") {
            setIsMenuOpen(true);
          }
        }}
        onKeyDown={(event) => {
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
            onCreateLine?.(value.trim());
            setValue("");
          }
        }}
        className="h-11 w-full rounded-xl border border-transparent bg-transparent px-1 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-border focus:bg-muted/30 focus:px-3 focus:shadow-sm"
      />
      {isMenuOpen ? <SlashCommandMenu commands={commands} /> : null}
    </div>
  );
}
