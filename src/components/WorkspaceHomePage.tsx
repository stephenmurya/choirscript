"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CloudOff,
  Copy,
  Eye,
  FileText,
  Guitar,
  ListMusic,
  Loader2,
  Mic2,
  MoreVertical,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Trash,
  type LucideIcon,
} from "lucide-react";
import type { SongContributorPreview, SongMeta, SongModuleKey } from "@/lib/firebase/types";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { NewSongDialog } from "./NewSongDialog";
import { OnboardingDialog } from "./OnboardingDialog";

type SongActionId = "open" | "rehearsal" | "share" | "duplicate" | "delete";

const SONG_ACTION_ITEMS: Array<{
  id: SongActionId;
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  separatorBefore?: boolean;
}> = [
  { id: "open", label: "Open", icon: FileText },
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
 * Module vocabulary for card indicators.
 *
 * PRESENCE, NOT CHECKLIST: an icon renders only when that module currently
 * contains content in THIS project. There are no disabled placeholders for
 * absent modules. Future modules (arrangement, band, production) activate per
 * project via their save-path derivations — the card renderer already
 * understands every key, so those phases require no card redesign.
 *
 * Each entry carries a tooltip label; the icon is aria-labelled so the card
 * stays visually icon-only while remaining accessible.
 */
const MODULE_ICONS: Record<SongModuleKey, { icon: LucideIcon; label: string }> = {
  lyrics: { icon: FileText, label: "Lyrics" },
  vocalParts: { icon: Mic2, label: "Vocal parts" },
  arrangement: { icon: ListMusic, label: "Arrangement" },
  band: { icon: Guitar, label: "Band" },
  production: { icon: SlidersHorizontal, label: "Production" },
};

const MAX_CONTRIBUTOR_AVATARS = 3;

/** Human-friendly recency, evaluated at render time (no timers). */
function formatRecency(value: string): string {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Edited recently";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Edited just now";
  }
  if (minutes < 60) {
    return `Edited ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Edited ${hours}h ago`;
  }

  const sinceYesterday = hours < 48 && new Date(timestamp).getDate() !== new Date().getDate();
  if (hours < 48 && sinceYesterday) {
    return "Edited yesterday";
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Edited ${days}d ago`;
  }

  return `Edited ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))}`;
}

function ContributorAvatar({
  displayName,
  photoURL,
}: {
  displayName: string;
  photoURL?: string;
}) {
  const initials = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="grid size-6 place-items-center overflow-hidden rounded-full border border-background bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt=""
                className="size-6"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </span>
        }
      >
        {displayName || "Contributor"}
      </TooltipTrigger>
      <TooltipContent>{displayName || "Contributor"}</TooltipContent>
    </Tooltip>
  );
}

function ContributorGroup({
  contributors,
}: {
  contributors: SongContributorPreview[];
}) {
  if (contributors.length === 0) {
    return null;
  }

  const visible = contributors.slice(0, MAX_CONTRIBUTOR_AVATARS);

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((contributor) => (
        <ContributorAvatar
          key={contributor.uid}
          displayName={contributor.displayName}
          photoURL={contributor.photoURL}
        />
      ))}
      {contributors.length > MAX_CONTRIBUTOR_AVATARS ? (
        <span className="grid size-6 place-items-center rounded-full border border-background bg-muted text-[10px] font-semibold text-muted-foreground">
          +{contributors.length - MAX_CONTRIBUTOR_AVATARS}
        </span>
      ) : null}
    </div>
  );
}

/**
 * One song card.
 *
 * Interaction model (unchanged from the Phase 2.2 repair):
 * - wrapper div: right-click surface only, no click handler
 * - title Link: the only navigating element
 * - ⋯ button: sibling of the Link, opens the menu
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
  const metadataParts = [song.artist, song.key, song.tempo ? `${song.tempo} BPM` : null].filter(
    Boolean,
  );
  const modules = song.cardSummary?.modules ?? [];
  const contributors = song.cardSummary?.contributors.preview ?? [];
  const contributorTotal = song.cardSummary?.contributors.total ?? contributors.length;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-card/70 p-4 transition hover:border-sidebar-accent hover:bg-sidebar-accent/40" />
        }
      >
        {/* Top row: title + More */}
        <div className="flex items-start gap-2">
          <Link
            href={`/songs/${song.id}`}
            className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block truncate text-sm font-semibold text-foreground">
              {song.title || "Untitled Song"}
            </span>
          </Link>

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
        </div>

        {/* Metadata: one line — artist · key · BPM (omitted when all absent) */}
        {metadataParts.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {metadataParts.join(" · ")}
          </p>
        ) : null}

        {/* Module state: icon-only presence indicators (reserves a row so
            cards stay consistent whether or not modules have content) */}
        <div className="mt-3 flex h-4 items-center gap-2.5 text-muted-foreground">
          {modules.map((moduleKey) => {
            const entry = MODULE_ICONS[moduleKey];

            if (!entry) {
              return null;
            }

            return (
              <Tooltip key={moduleKey}>
                <TooltipTrigger
                  render={<entry.icon aria-label={entry.label} className="size-4" />}
                />
                <TooltipContent>{entry.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Footer pinned to the card bottom: contributors left, recency right.
            mt-auto pushes it down so all cards share the same height. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          {contributorTotal > 0 ? (
            <ContributorGroup contributors={contributors} />
          ) : (
            <span />
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRecency(song.updatedAt)}
          </span>
        </div>
      </ContextMenuTrigger>

      {/* Right-click menu — same shared action list */}
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
 * Workspace (`/`): the canonical song library. Cards render from SongMeta
 * only (card summary included) — no document/current reads.
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
      router.push(`/songs/${song.id}`);
      toast.info("Open the song, then use Share to create a view-only link.");
    },
    duplicate: (song) => {
      withPending(song.id, async () => {
        const copyMeta = await duplicateSong(song.id);
        if (copyMeta) {
          router.push(`/songs/${copyMeta.id}`);
        }
      });
    },
    delete: (song) => {
      if (!window.confirm(`Delete "${song.title || "Untitled Song"}"?`)) {
        return;
      }

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
            <SongCard key={song.id} song={song} isPending={pendingId === song.id} actions={actions} />
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
