"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CloudOff,
  Copy,
  Eye,
  Library,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Trash,
} from "lucide-react";
import type { SongMeta } from "@/lib/firebase/types";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NewSongDialog } from "./NewSongDialog";
import { OnboardingDialog } from "./OnboardingDialog";

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

type SongActionId = "open" | "rehearsal" | "share" | "duplicate" | "delete";

/**
 * Workspace (`/`): the canonical song-library surface. Top navbar (in the
 * layout) carries identity and New Song; this page handles search, the song
 * list, and per-song actions via a SHARED menu (More button + right-click).
 */
export function WorkspaceHomePage() {
  const router = useRouter();
  const { songs, isLoading, error, reload, createSong, duplicateSong, deleteSong } =
    useWorkspaceSongs();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
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

  function handleShare(songMeta: SongMeta) {
    // Share needs the full Song document (snapshot payload); the editor owns
    // that flow, so route there. Metadata-only cost discipline is preserved.
    router.push(`/songs/${songMeta.id}`);
    toast.info("Open the song, then use Share to create a view-only link.");
  }

  function runAction(action: SongActionId, song: SongMeta) {
    switch (action) {
      case "open":
        router.push(`/songs/${song.id}`);
        break;
      case "rehearsal":
        router.push(`/songs/${song.id}/rehearsal`);
        break;
      case "share":
        handleShare(song);
        break;
      case "duplicate":
        handleDuplicate(song);
        break;
      case "delete":
        handleDelete(song);
        break;
    }
  }

  const actionHandlers = {
    onOpen: (song: SongMeta) => runAction("open", song),
    onRehearsal: (song: SongMeta) => runAction("rehearsal", song),
    onShare: (song: SongMeta) => runAction("share", song),
    onDuplicate: (song: SongMeta) => runAction("duplicate", song),
    onDelete: (song: SongMeta) => runAction("delete", song),
  };

  function renderActionItems(
    song: SongMeta,
    Item: typeof ContextMenuItem,
    Separator: typeof ContextMenuSeparator,
  ) {
    return (
      <>
        <Item onClick={() => actionHandlers.onOpen(song)}>
          <Library data-icon="inline-start" />
          Open
        </Item>
        <Item onClick={() => actionHandlers.onRehearsal(song)}>
          <Eye data-icon="inline-start" />
          Rehearsal / Preview
        </Item>
        <Item onClick={() => actionHandlers.onShare(song)}>
          <Share2 data-icon="inline-start" />
          Share
        </Item>
        <Separator />
        <Item onClick={() => actionHandlers.onDuplicate(song)}>
          <Copy data-icon="inline-start" />
          Duplicate
        </Item>
        <Separator />
        <Item className="text-destructive data-[variant=destructive]:text-destructive" onClick={() => actionHandlers.onDelete(song)}>
          <Trash data-icon="inline-start" />
          Delete
        </Item>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {songs.length === 0
              ? "Your rehearsal scripts will live here."
              : `${songs.length} song${songs.length === 1 ? "" : "s"}, most recently updated first.`}
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
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
            Create your first song
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && songs.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60">
          {visibleSongs.map((song) => (
            <ContextMenu key={song.id}>
              <ContextMenuTrigger
                render={
                  <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 transition last:border-b-0 hover:bg-sidebar-accent/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {song.title || "Untitled Song"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[song.artist, song.key, song.tempo].filter(Boolean).join(" / ") ||
                          "No details"}
                        {" · "}
                        Updated {formatUpdated(song.updatedAt)}
                      </p>
                    </div>
                  </div>
                }
              />
              {/* Row click opens the song */}
              <button
                type="button"
                aria-label={`Open ${song.title || "Untitled Song"}`}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                onClick={() => runAction("open", song)}
                tabIndex={-1}
              />
              {pendingId === song.id ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreVertical />
                        <span className="sr-only">Song actions</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    {(
                      [
                        { id: "open" as SongActionId, label: "Open", icon: Library, separator: false },
                        { id: "rehearsal" as SongActionId, label: "Rehearsal / Preview", icon: Eye, separator: false },
                        { id: "share" as SongActionId, label: "Share", icon: Share2, separator: false },
                        { id: "duplicate" as SongActionId, label: "Duplicate", icon: Copy, separator: true },
                        { id: "delete" as SongActionId, label: "Delete", icon: Trash, separator: true },
                      ]
                    ).map((action) => (
                      <div key={action.id} className="contents">
                        {action.separator ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          variant={action.id === "delete" ? "destructive" : "default"}
                          onClick={() => runAction(action.id, song)}
                        >
                          <action.icon data-icon="inline-start" />
                          {action.label}
                        </DropdownMenuItem>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* Right-click menu — same actions */}
              <ContextMenuContent>
                {renderActionItems(song, ContextMenuItem, ContextMenuSeparator)}
              </ContextMenuContent>
            </ContextMenu>
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
      <OnboardingDialog open={isTipsOpen} onOpenChange={setIsTipsOpen} />
    </div>
  );
}
