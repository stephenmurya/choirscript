"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { SharedSongPayload } from "@/lib/songTypes";
import { subscribeShareHead } from "@/lib/shareHeads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvancedTimingRehearsalView } from "@/components/AdvancedTimingRehearsalView";
import { ColorfulRehearsalView, type RehearsalDisplayToggles } from "@/components/ColorfulRehearsalView";
import { SharedPageActions } from "@/components/SharedPageActions";
import { formatTempo } from "@/lib/songDisplay";
import { getEnabledVoiceParts } from "@/lib/songSelection";

/**
 * A shared link renders the live song, not a frozen copy: the editor republishes
 * on save and rings a Firestore doorbell, and this view swaps the new revision in
 * without a reload so nobody loses their place mid-rehearsal.
 *
 * The doorbell is push-only — nothing moves while the song is idle. The one thing
 * push cannot cover is a tab that was asleep or offline when the write landed, so
 * returning to the tab does a single catch-up check.
 */
const UPDATED_FLASH_MS = 6000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic on both sides of hydration: UTC, fixed month names. */
function stampTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");

  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} · ${hh}:${mm} UTC`;
}

const baseToggles: RehearsalDisplayToggles = {
  soprano: true,
  alto: true,
  tenor: true,
  bass: true,
  techniques: true,
  directorNotes: true,
  largeText: false,
  blackAndWhite: false,
  enabledParts: ["soprano", "alto", "tenor", "bass"],
};

export function SharedSongLive({ initialPayload }: { initialPayload: SharedSongPayload }) {
  const [payload, setPayload] = useState(initialPayload);
  const [justUpdated, setJustUpdated] = useState(false);
  const revisionRef = useRef(initialPayload.revision);
  const shareIdRef = useRef(initialPayload.shareId);
  const flashTimer = useRef<number | null>(null);

  /** Pull the current payload and swap it in without a navigation. */
  const fetchAndSwap = useCallback(async () => {
    try {
      const full = await fetch(`/api/share/${shareIdRef.current}`, { cache: "no-store" });

      if (!full.ok) {
        return;
      }

      const next = (await full.json()) as SharedSongPayload;

      if (typeof next.revision === "number" && next.revision <= revisionRef.current) {
        return;
      }

      revisionRef.current = next.revision;
      setPayload(next);
      setJustUpdated(true);

      if (flashTimer.current) {
        window.clearTimeout(flashTimer.current);
      }

      flashTimer.current = window.setTimeout(() => setJustUpdated(false), UPDATED_FLASH_MS);
    } catch {
      // Silent: the doorbell or the next focus check will try again.
    }
  }, []);

  const pullLatest = useCallback(async () => {
    try {
      const head = await fetch(`/api/share/${shareIdRef.current}/rev`, { cache: "no-store" });

      if (!head.ok) {
        return;
      }

      const revision = (await head.json()) as { revision?: number };

      if (typeof revision.revision !== "number" || revision.revision <= revisionRef.current) {
        return;
      }

      await fetchAndSwap();
    } catch {
      // A dropped catch-up is not worth telling a singer about; returning to the
      // tab again retries.
    }
  }, [fetchAndSwap]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void pullLatest();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    // Push: the editor rings this doorbell after every publish, so the page only
    // talks to the network when the song actually changed.
    const unsubscribe = subscribeShareHead(shareIdRef.current, (head) => {
      if (head.revision > revisionRef.current) {
        void fetchAndSwap();
      }
    });

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (flashTimer.current) {
        window.clearTimeout(flashTimer.current);
      }
    };
  }, [fetchAndSwap, pullLatest]);

  const song = payload.song;
  const toggles: RehearsalDisplayToggles = {
    ...baseToggles,
    enabledParts: getEnabledVoiceParts(song),
  };
  const meta = [
    payload.artist ? `Singer: ${payload.artist}` : null,
    payload.key ? `Key: ${payload.key}` : null,
    formatTempo(payload.bpm) || null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-svh overflow-x-clip bg-background text-foreground">
      <header className="no-print border-b border-border bg-background px-3 py-4 sm:px-5">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                CS
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">ChoirScript</span>
                <span className="block text-xs text-muted-foreground">Shared rehearsal script</span>
              </span>
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-foreground">{payload.title}</h1>
              <Badge variant="outline">Read-only</Badge>
              <Badge variant="secondary" data-share-live="true">
                Live
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${justUpdated ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
                />
                {justUpdated ? "Updated just now" : `Updated ${stampTime(payload.updatedAt)}`}
              </span>
            </div>
            {meta ? <p className="mt-1 text-sm text-muted-foreground">{meta}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <SharedPageActions />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Refresh now"
              onClick={() => void pullLatest()}
            >
              <RefreshCw />
            </Button>
          </div>
        </div>
      </header>

      {song.mode === "advanced" ? (
        <AdvancedTimingRehearsalView song={song} toggles={toggles} />
      ) : (
        <ColorfulRehearsalView song={song} toggles={toggles} />
      )}
    </main>
  );
}
