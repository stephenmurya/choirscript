"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSongById } from "@/lib/songStorage";
import { songHasBass } from "@/lib/songSelection";
import type { Song } from "@/lib/songTypes";
import { Switch } from "@/components/ui/switch";
import { AdvancedTimingRehearsalView } from "./AdvancedTimingRehearsalView";
import {
  ColorfulRehearsalView,
  type RehearsalDisplayToggles,
} from "./ColorfulRehearsalView";
import { PrintToolbar } from "./PrintToolbar";

type RehearsalViewProps = {
  songId: string;
};

const toggleLabels: Array<{
  key: keyof RehearsalDisplayToggles;
  label: string;
}> = [
  { key: "soprano", label: "Show Soprano" },
  { key: "alto", label: "Show Alto" },
  { key: "tenor", label: "Show Tenor" },
  { key: "bass", label: "Show Bass" },
  { key: "techniques", label: "Show Techniques" },
  { key: "directorNotes", label: "Show Director Notes" },
  { key: "largeText", label: "Large Text Mode" },
  { key: "blackAndWhite", label: "Simple black-and-white print" },
];

export function RehearsalView({ songId }: RehearsalViewProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toggles, setToggles] = useState<RehearsalDisplayToggles>({
    soprano: true,
    alto: true,
    tenor: true,
    bass: false,
    techniques: true,
    directorNotes: true,
    largeText: false,
    blackAndWhite: false,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadedSong = getSongById(songId);
      setSong(loadedSong ?? null);
      if (loadedSong) {
        setToggles((current) => ({ ...current, bass: songHasBass(loadedSong) }));
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [songId]);

  if (!loaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading rehearsal view...
      </main>
    );
  }

  if (!song) {
    return (
      <main className="min-h-screen bg-background px-4 py-12 text-foreground">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Song not found</h1>
          <p className="mt-3 text-muted-foreground">
            This song may have been deleted from localStorage.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <PrintToolbar
        songId={song.id}
        blackAndWhite={toggles.blackAndWhite}
        onBlackAndWhiteChange={(blackAndWhite) =>
          setToggles((current) => ({ ...current, blackAndWhite }))
        }
      />
      <div className="no-print mx-auto max-w-[900px] px-3 py-4 sm:px-5">
        <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Display and export
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {toggleLabels.map((toggle) => (
              <label
                key={toggle.key}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground"
              >
                <Switch
                  checked={toggles[toggle.key]}
                  onCheckedChange={(checked) =>
                    setToggles((current) => ({
                      ...current,
                      [toggle.key]: checked,
                    }))
                  }
                />
                {toggle.label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Color PDF export uses browser print backgrounds. Enable Background graphics in the
            print dialog if highlights do not appear.
          </p>
        </section>
      </div>

      {song.mode === "advanced" ? (
        <AdvancedTimingRehearsalView song={song} toggles={toggles} />
      ) : (
        <ColorfulRehearsalView song={song} toggles={toggles} />
      )}
    </main>
  );
}
