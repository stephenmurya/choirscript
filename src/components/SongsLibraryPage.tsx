"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CloudOff,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import type { SongMeta } from "@/lib/firebase/types";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NewSongDialog } from "./NewSongDialog";

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Songs library (`/songs`): canonical song management surface — search,
 * create, duplicate, delete. Metadata only.
 */
export function SongsLibraryPage() {
  const router = useRouter();
  const { songs, isLoading, error, reload, createSong, duplicateSong, deleteSong } =
    useWorkspaceSongs();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visibleSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return songs;
    }

    return songs.filter((song) =>
      [song.title, song.artist, song.key, song.tempo]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [searchQuery, songs]);

  async function withPending(songId: string, action: () => Promise<unknown>) {
    setPendingId(songId);

    try {
      await action();
    } catch (actionError) {
      console.error("Song action failed", actionError);
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPendingId(null);
    }
  }

  function handleDuplicate(songMeta: SongMeta) {
    withPending(songMeta.id, async () => {
      const copyMeta = await duplicateSong(songMeta.id);
      if (copyMeta) {
        router.push(`/songs/${copyMeta.id}`);
      }
    });
  }

  function handleDelete(songMeta: SongMeta) {
    if (!window.confirm(`Delete "${songMeta.title || "Untitled Song"}"?`)) {
      return;
    }

    withPending(songMeta.id, () => deleteSong(songMeta.id));
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Songs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {songs.length === 0
              ? "Your library is empty."
              : `${songs.length} song${songs.length === 1 ? "" : "s"}, most recently updated first.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Search songs</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs"
              className="pl-9"
            />
          </label>
          <Button type="button" size="sm" onClick={() => setIsNewSongOpen(true)}>
            <Plus data-icon="inline-start" />
            New song
          </Button>
        </div>
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

      {!isLoading && !error && songs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <p className="text-lg font-medium text-foreground">No songs yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create your first rehearsal script — lyrics, SATB cues and timing live together in one
            song.
          </p>
          <Button type="button" className="mt-5" onClick={() => setIsNewSongOpen(true)}>
            <Plus data-icon="inline-start" />
            New song
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && songs.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60">
          {visibleSongs.map((song) => (
            <div
              key={song.id}
              className="group flex items-center gap-3 border-b border-border/70 px-4 py-3 transition last:border-b-0 hover:bg-sidebar-accent/30"
            >
              <Link href={`/songs/${song.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {song.title || "Untitled Song"}
                  </span>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {song.mode === "advanced" ? "Timed" : "Simple"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[song.artist, song.key, song.tempo].filter(Boolean).join(" / ") || "No details"}
                  {" · "}
                  Updated {formatUpdated(song.updatedAt)}
                </p>
              </Link>

              {pendingId === song.id ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" />
                    }
                  >
                    <MoreHorizontal />
                    <span className="sr-only">Song actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => handleDuplicate(song)}>
                        <Copy data-icon="inline-start" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(song)}>
                        <Trash data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {visibleSongs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No songs match that search.
            </div>
          ) : null}
        </div>
      ) : null}

      <NewSongDialog
        open={isNewSongOpen}
        onClose={() => setIsNewSongOpen(false)}
        onCreate={(metadata) => {
          setIsNewSongOpen(false);
          withPending("create", async () => {
            const meta = await createSong(metadata);
            if (meta) {
              router.push(`/songs/${meta.id}`);
            }
          });
        }}
      />
    </div>
  );
}
