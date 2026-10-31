"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * The drag strip between a sidebar and the script. Sits on the panel's inner
 * edge, is invisible until hovered/focused, and keeps a 16px hit area so it is
 * grabbable without pointing at a 2px line.
 */
export function PanelResizeHandle({
  edge,
  dragging,
  label,
  onPointerDown,
  onReset,
}: {
  /** Which side of the panel the handle lives on. */
  edge: "left" | "right";
  dragging: boolean;
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onReset: () => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onReset();
        }
      }}
      title={`${label} — drag to resize, double-click to reset`}
      className={`absolute inset-y-0 z-30 hidden w-4 cursor-col-resize touch-none xl:block ${
        edge === "left" ? "-left-2" : "-right-2"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
          dragging ? "bg-primary" : "bg-transparent hover:bg-primary/60"
        }`}
      />
    </div>
  );
}
