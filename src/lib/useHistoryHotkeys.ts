"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();

  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

/**
 * Song-level undo/redo shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y.
 *
 * Focus inside a text field is deliberately left alone so the browser's native
 * character-level undo keeps working while someone edits a lyric or a note.
 */
export function useHistoryHotkeys(undo: () => void, redo: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key !== "z" && key !== "y") {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (key === "y" || event.shiftKey) {
        redo();
        return;
      }

      undo();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
}
