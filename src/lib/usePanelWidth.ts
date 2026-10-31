"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Rem in px at the default root size, used for clamping and defaults. */
const REM = 16;
const STORAGE_EVENT = "choirscript:panel-width";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function subscribeToStoredWidth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

type PanelWidthOptions = {
  /** localStorage key; the width survives reloads per browser. */
  storageKey: string;
  /** Minimum width in rem. The shipped default doubles as the floor. */
  minRem: number;
  maxRem: number;
  initialRem: number;
};

/**
 * Drag-to-resize width for an editor sidebar.
 *
 * The width is a plain pixel number written into a CSS variable on the editor
 * grid, so the layout stays a normal grid column instead of an absolutely
 * positioned overlay. The minimum is the width the panel ships with, which
 * keeps every control inside it legible.
 *
 * The persisted value is read through useSyncExternalStore: the server renders
 * the default, then the client swaps in the stored width without a hydration
 * mismatch and without writing state from an effect.
 */
export function usePanelWidth({ storageKey, minRem, maxRem, initialRem }: PanelWidthOptions) {
  const min = minRem * REM;
  const max = maxRem * REM;
  const fallback = initialRem * REM;
  const [draggedWidth, setDraggedWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<number | null>(null);

  const storedWidth = useSyncExternalStore(
    subscribeToStoredWidth,
    () => window.localStorage.getItem(storageKey) ?? "",
    () => "",
  );

  const parsedStored = Number(storedWidth);
  const width =
    draggedWidth ??
    (storedWidth && Number.isFinite(parsedStored) && parsedStored > 0
      ? clamp(parsedStored, min, max)
      : fallback);

  const persist = useCallback(
    (value: number) => {
      try {
        window.localStorage.setItem(storageKey, String(Math.round(value)));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      } catch {
        // Non-fatal: the drag still works for this session.
      }
    },
    [storageKey],
  );

  /**
   * `direction` is +1 when dragging right grows the panel (panel sits on the
   * left of the page) and -1 when dragging right shrinks it (panel sits on the
   * right).
   */
  const beginResize = useCallback(
    (event: React.PointerEvent<HTMLElement>, direction: 1 | -1) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function handleMove(moveEvent: PointerEvent) {
        const nextWidth = clamp(startWidth + (moveEvent.clientX - startX) * direction, min, max);

        if (frame.current !== null) {
          cancelAnimationFrame(frame.current);
        }

        frame.current = requestAnimationFrame(() => setDraggedWidth(nextWidth));
      }

      function handleUp() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setDragging(false);
        frame.current = null;
        setDraggedWidth((current) => {
          if (current !== null) {
            persist(current);
          }

          return current;
        });
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [width, min, max, persist],
  );

  const reset = useCallback(() => {
    setDraggedWidth(null);
    persist(initialRem * REM);
  }, [initialRem, persist]);

  useEffect(
    () => () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [],
  );

  return { width, dragging, beginResize, reset, min, max };
}
