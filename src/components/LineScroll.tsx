"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal scroll port for one rehearsal line.
 *
 * The lyric grid is intrinsically wider than a phone screen, so the line must
 * scroll inside itself. Two things went wrong before this component existed:
 *
 * 1. The line's scroll port was allowed to grow past the viewport (its parent
 *    grid track sized to max-content), so `overflow-x: auto` never engaged and
 *    the trailing syllables/part values were clipped away by the page.
 * 2. Touch browsers draw no scrollbar, so even a working scroll port gave no
 *    hint that there was more line to the right.
 *
 * This wrapper keeps the scroll port at `w-full`/`min-w-0` and adds a right
 * edge fade plus a small "swipe" chip that disappear as soon as the line is
 * scrolled to its end. Nothing here is printed: the overlays are `no-print`
 * and the print stylesheet restores `overflow: visible` on `.line-scroll`.
 */

const EDGE_SLACK_PX = 2;

type ScrollState = {
  overflowing: boolean;
  atStart: boolean;
  atEnd: boolean;
};

const INITIAL_STATE: ScrollState = { overflowing: false, atStart: true, atEnd: true };

export function LineScroll({
  children,
  label = "Lyric line",
  hint = "Swipe",
}: {
  children: ReactNode;
  label?: string;
  hint?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [state, setState] = useState<ScrollState>(INITIAL_STATE);

  const measure = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const maxScroll = element.scrollWidth - element.clientWidth;

    setState((current) => {
      const next: ScrollState = {
        overflowing: maxScroll > EDGE_SLACK_PX,
        atStart: element.scrollLeft <= EDGE_SLACK_PX,
        atEnd: element.scrollLeft >= maxScroll - EDGE_SLACK_PX,
      };

      return current.overflowing === next.overflowing &&
        current.atStart === next.atStart &&
        current.atEnd === next.atEnd
        ? current
        : next;
    });
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    measure();
  });

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    let observer: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(element);
      Array.from(element.children).forEach((child) => observer?.observe(child));
    }

    window.addEventListener("resize", scheduleMeasure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleMeasure]);

  const showFade = state.overflowing && !state.atEnd;
  const showHint = state.overflowing && state.atStart;

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={scrollRef}
        data-line-scroll="true"
        className="line-scroll max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-2 scroll-px-3"
        onScroll={scheduleMeasure}
        role="group"
        aria-label={label}
        tabIndex={state.overflowing ? 0 : undefined}
      >
        {children}
      </div>
      {showFade ? (
        <div
          aria-hidden="true"
          className="line-scroll-fade no-print pointer-events-none absolute inset-y-0 right-0 w-10"
        />
      ) : null}
      {showHint ? (
        <span
          aria-hidden="true"
          className="line-scroll-hint no-print pointer-events-none absolute bottom-1 right-1.5 sm:hidden"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
