"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CloudOff,
  Copy,
  Eye,
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

const SONG_ACTION_ITEMS: Array<{
  id: SongActionId;
  label: string;
  icon: typeof Copy;
  destructive?: boolean;
  separatorBefore?: boolean;
}> = [
  { id: "open", label: "Open", icon: Copy },
  { id: "rehearsal", label: "Rehearsal / Preview", icon: Eye },
  { id: "share", label: "Share", icon: Share2 },
  { id: "duplicate", label: "Duplicate", icon: Copy, separatorBefore: true },
  { id: "delete", label: "Delete", icon: Trash, destructive: true, separatorBefore: true },
];

type SongActionHandlers = {
  open: (song: SongMeta) => void;
  rehearsal: (song: SongMeta) => void;
  share: (song: SongMeta) => void;
  duplicate: (song: SongMeta) => void;
  delete: (song: SongMeta) => void;
};

/**
 * One song card in the workspace grid.
 *
 * Interaction model (deliberate boundaries — no invisible overlays):
 * - The card wrapper is a plain div; it carries the right-click
 *   (ContextMenuTrigger) surface only. It has NO click handler.
 * - The title/metadata area is a real <Link> → opens the song.
 * - The More (⋯) button is a Base UI MenuTrigger <button>, a SIBLING of the
 *   link (never nested inside it) → opens the action menu only.
 * - Right-click does not trigger navigation (contextmenu !== click on Link).
 * - Empty workspace space belongs to no card and no handler.
 */
function SongCard({
  song,
  isPending,
  actions,
}: {
  song: SongMeta;
  isPending: boolean;
  actions: SongActionHandlers;
}) {
  const metadata = [song.artist, song.key, song.tempo].filter(Boolean).join(" / ");

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div className="group relative flex items-start gap-2 rounded-2xl border border-border bg-card/70 p-4 transition hover:border-sidebar-accent hover:bg-sidebar-accent/40" />
        }
      >
        {/* Main content — the only element that navigates */}
        <Link
          href={`/songs/${song.id}`}
          className="min-w-0 flex-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block truncate text-sm font-semibold text-foreground">
            {song.title || "Untitled Song"}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {metadata || "No details"}
          </span>
          <span className="mt-3 block text-xs text-muted-foreground">
            Updated {formatUpdated(song.updatedAt)}
          </span>
        </Link>

        {/* More (⋯) — separate interactive element, sibling of the Link */}
        {isPending ? (
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical />
                  <span className="sr-only">Actions for {song.title || "Untitled Song"}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {SONG_ACTION_ITEMS.map((action) => (
                <div key={action.id} className="contents">
                  {action.separatorBefore ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    variant={action.destructive ? "destructive" : "default"}
                    onClick={() => actions[action.id](song)}
                  >
                    <action.icon data-icon="inline-start" />
                    {action.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ContextMenuTrigger>

      {/* Right-click menu — same shared action list, same handlers */}
      <ContextMenuContent>
        {SONG_ACTION_ITEMS.map((action) => (
          <div key={action.id} className="contents">
            {action.separatorBefore ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              variant={action.destructive ? "destructive" : "default"}
              onClick={() => actions[action.id](song)}
            >
              <action.icon data-icon="inline-start" />
              {action.label}
            </ContextMenuItem>
          </div>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Workspace (`/`): the canonical song library. Top navbar (in the layout)
 * carries identity and the single New Song action; this page owns search,
 * the card grid, and per-song actions via shared definitions used by BOTH
 * the More menu and the right-click context menu.
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

  const actions: SongActionHandlers = {
    open: (song) => router.push(`/songs/${song.id}`),
    rehearsal: (song) => router.push(`/songs/${song.id}/rehearsal`),
    share: (song) => {
      // Share needs the full Song document for the snapshot payload; the
      // editor owns that flow, so route there. Metadata-only cost discipline
      // for the workspace is preserved (no document/current reads here).
      router.push(`/songs/${song.id}`);
      toast.info("Open the song, then use Share to create a view-only link.");
    },
    duplicate: (song) => {
      withPending(song.id, async () => {
        const copyMeta = await duplicateSong(song.id);
        if (copyMeta) {
          // Established create/duplicate flow: land in the copy.
          router.push(`/songs/${copyMeta.id}`);
        }
      });
    },
    delete: (song) => {
      if (!window.confirm(`Delete "${song.title || "Untitled Song"}"?`)) {
        return;
      }

      // No navigation on delete: the grid updates optimistically.
      withPending(song.id, () => deleteSong(song.id));
    },
  };

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
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isPending={pendingId === song.id}
              actions={actions}
            />
          ))}
          {visibleSongs.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
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
