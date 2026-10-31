"use client";

import { Button } from "@/components/ui/button";

export type EditorNavItem = "lyrics" | "parts" | "advanced";

const NAV_ITEMS: Array<{ key: EditorNavItem; label: string }> = [
  { key: "lyrics", label: "Lyrics" },
  { key: "parts", label: "Parts" },
  { key: "advanced", label: "Advanced timing" },
];

/**
 * The editor's three surfaces. Simple timing is the default, so "Advanced
 * timing" reads as a third sibling of Lyrics and Parts rather than a hidden
 * mode switch inside a sidebar.
 */
export function EditorNav({
  activeNav,
  onNavChange,
  variant = "desktop",
}: {
  activeNav: EditorNavItem;
  onNavChange: (nav: EditorNavItem) => void;
  variant?: "desktop" | "mobile";
}) {
  const mobile = variant === "mobile";

  return (
    <nav
      data-testid={`editor-nav-${variant}`}
      className={
        mobile
          ? "flex items-center gap-1 border-t border-border/60 px-3 py-1.5 md:hidden"
          : "hidden items-center gap-0.5 rounded-lg bg-muted/40 p-0.5 md:flex"
      }
      aria-label="Editor views"
    >
      {NAV_ITEMS.map((item) => (
        <Button
          key={item.key}
          type="button"
          variant={activeNav === item.key ? "secondary" : "ghost"}
          size="sm"
          className={mobile ? "flex-1" : undefined}
          onClick={() => onNavChange(item.key)}
          aria-pressed={activeNav === item.key}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
