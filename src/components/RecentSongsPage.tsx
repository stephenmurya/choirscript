"use client";

import Link from "next/link";
import { Clock as ClockIcon, CloudOff, Loader2 } from "lucide-react";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Recent (`/songs/recent`): recently *updated* songs, derived from existing
 * metadata (updatedAt desc). No separate database model, no tracking.
 */
export function RecentSongsPage() {
  const { recentSongs, songs, isLoading, error, reload } = useWorkspaceSongs();

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ClockIcon className="size-5" />
          Recent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Songs you&apos;ve updated most recently
          {songs.length > 0 ? ` — latest of ${songs.length} in this workspace` : ""}.
        </p>
      </header>

      {error ? (
        <Card className="mt-8 border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CloudOff className="mt-0.5 size-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Couldn&apos;t load your songs</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !error ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading songs...
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="mt-6 flex flex-col gap-2">
          {recentSongs.map((song) => (
            <Link
              key={song.id}
              href={`/songs/${song.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 transition hover:bg-sidebar-accent/30"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {song.title || "Untitled Song"}
                  </span>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {song.mode === "advanced" ? "Timed" : "Simple"}
                  </Badge>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[song.artist, song.key, song.tempo].filter(Boolean).join(" / ") || "No details"}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Updated {formatUpdated(song.updatedAt)}
              </span>
            </Link>
          ))}
          {recentSongs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <p className="text-lg font-medium text-foreground">Nothing recent yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Songs you create or edit will appear here.
              </p>
              <Button render={<Link href="/songs" />} variant="outline" className="mt-5">
                Go to Songs
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
