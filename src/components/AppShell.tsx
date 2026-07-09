"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Printer,
  Search,
  Settings,
  Share2,
  Trash,
} from "lucide-react";
import {
  createEmptySong,
  deleteSong,
  duplicateSong,
  loadSongs,
  saveSong,
} from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NewSongDialog } from "./NewSongDialog";
import { OnboardingDialog } from "./OnboardingDialog";
import { ShareDialog } from "./ShareDialog";

type AppShellProps = {
  activeSongId?: string | null;
  currentSong?: Song | null;
  saveStatus?: string;
  onSave?: () => void;
  children?: ReactNode;
};

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function songMetadata(song: Song) {
  return [song.artist, song.key, song.tempo].filter(Boolean).join(" / ");
}

function sortSongs(songs: Song[]) {
  return songs.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function EmptyWorkspace({
  onNewSong,
  onShowTips,
}: {
  onNewSong: () => void;
  onShowTips: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-border/70 bg-card/80 shadow-2xl shadow-background/20">
        <CardHeader>
          <CardTitle className="text-2xl">Select a song or create a new one</CardTitle>
          <CardDescription>
            ChoirScript keeps your rehearsal scripts local for now. Choose a saved song from the
            sidebar, or start a new document.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={onNewSong}>
            <Plus data-icon="inline-start" />
            New Song
          </Button>
          <Button type="button" variant="outline" onClick={onShowTips}>
            <HelpCircle data-icon="inline-start" />
            Show tips
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppShell({
  activeSongId = null,
  currentSong = null,
  saveStatus,
  onSave,
  children,
}: AppShellProps) {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSongs(loadSongs());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!currentSong) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSongs((existingSongs) => {
        const withoutCurrent = existingSongs.filter((song) => song.id !== currentSong.id);
        return sortSongs([currentSong, ...withoutCurrent]);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentSong]);

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

  function refreshSongs() {
    setSongs(loadSongs());
  }

  function handleCreateSong(
    metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
  ) {
    const song = {
      ...createEmptySong(),
      ...metadata,
    };

    saveSong(song);
    refreshSongs();
    setIsNewSongOpen(false);
    setIsSidebarOpen(false);
    router.push(`/songs/${song.id}`);
  }

  function handleDuplicate(song: Song) {
    const copy = duplicateSong(song);
    saveSong(copy);
    refreshSongs();
    router.push(`/songs/${copy.id}`);
  }

  function handleDelete(song: Song) {
    if (!window.confirm(`Delete "${song.title || "Untitled Song"}"?`)) {
      return;
    }

    deleteSong(song.id);
    refreshSongs();

    if (song.id === activeSongId) {
      router.push("/");
    }
  }

  function openShareDialog() {
    onSave?.();
    setIsShareOpen(true);
  }

  function renderSidebarContent() {
    return (
      <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex flex-col gap-4 p-4">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-1 py-1 text-left"
          >
            <span className="grid size-9 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              CS
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-sidebar-foreground">
                ChoirScript
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Choir direction editor
              </span>
            </span>
          </Link>

          <Button type="button" onClick={() => setIsNewSongOpen(true)} className="w-full">
            <Plus data-icon="inline-start" />
            New Song
          </Button>

          <label className="relative block">
            <span className="sr-only">Search songs</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs"
              className="pl-9"
            />
          </label>
        </div>

        <div className="px-3">
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !activeSongId && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <FileText data-icon="inline-start" />
              All Songs
              <Badge variant="secondary" className="ml-auto">
                {songs.length}
              </Badge>
            </Link>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Clock data-icon="inline-start" />
              Recent
            </button>
            <button
              type="button"
              onClick={() => setIsTipsOpen(true)}
              className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <HelpCircle data-icon="inline-start" />
              Tips / Help
            </button>
            <button
              type="button"
              disabled
              className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground/60"
            >
              <Settings data-icon="inline-start" />
              Settings
            </button>
          </nav>
        </div>

        <Separator className="my-3" />

        <div className="px-4 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Songs
        </div>
        <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
          <div className="flex flex-col gap-1">
            {visibleSongs.map((song) => {
              const isActive = song.id === activeSongId;
              const metadata = songMetadata(song);

              return (
                <div
                  key={song.id}
                  className={cn(
                    "group/song flex items-center gap-1 rounded-2xl px-2 py-1 transition",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/70",
                  )}
                >
                  <Link
                    href={`/songs/${song.id}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className="min-w-0 flex-1 rounded-xl px-2 py-2"
                  >
                    <span className="block truncate text-sm font-medium">
                      {song.title || "Untitled Song"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {metadata || `Updated ${formatUpdated(song.updatedAt)}`}
                    </span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-70 transition group-hover/song:opacity-100"
                        />
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
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(song)}
                        >
                          <Trash data-icon="inline-start" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {visibleSongs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No songs match that search.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-background text-foreground lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="no-print hidden min-h-svh border-r border-sidebar-border bg-sidebar lg:block">
        {renderSidebarContent()}
      </aside>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-[20rem] max-w-[85vw] p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>ChoirScript navigation</SheetTitle>
            <SheetDescription>Switch songs and open app utilities.</SheetDescription>
          </SheetHeader>
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <PanelLeft />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {currentSong?.title || "ChoirScript"}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {currentSong ? songMetadata(currentSong) || "No metadata yet" : "Local choir scripts"}
              </p>
            </div>

            {currentSong ? (
              <div className="flex items-center gap-2">
                {saveStatus ? (
                  <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
                    <CheckCircle data-icon="inline-start" />
                    {saveStatus}
                  </Badge>
                ) : null}
                <Button
                  render={<Link href={`/songs/${currentSong.id}/rehearsal`} />}
                  variant="outline"
                  size="sm"
                >
                    <Eye data-icon="inline-start" />
                    Preview
                </Button>
                <Button type="button" variant="outline" size="sm" className="hidden md:inline-flex" onClick={openShareDialog}>
                  <Share2 data-icon="inline-start" />
                  Share
                </Button>
                <Button
                  render={<Link href={`/songs/${currentSong.id}/rehearsal`} />}
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                    <Printer data-icon="inline-start" />
                    Print / Save PDF
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal />
                    <span className="sr-only">More actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      {onSave ? (
                        <DropdownMenuItem onClick={onSave}>
                          <CheckCircle data-icon="inline-start" />
                          Save now
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => handleDuplicate(currentSong)}>
                        <Copy data-icon="inline-start" />
                        Duplicate song
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsTipsOpen(true)}>
                        <HelpCircle data-icon="inline-start" />
                        Show tips
                      </DropdownMenuItem>
                      <DropdownMenuItem className="md:hidden" onClick={openShareDialog}>
                        <Share2 data-icon="inline-start" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="sm:hidden"
                        onClick={() => router.push(`/songs/${currentSong.id}/rehearsal`)}
                      >
                        <Printer data-icon="inline-start" />
                        Print / Save PDF
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(currentSong)}
                      >
                        <Trash data-icon="inline-start" />
                        Delete song
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button type="button" size="sm" onClick={() => setIsNewSongOpen(true)}>
                <Plus data-icon="inline-start" />
                New Song
              </Button>
            )}
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden">
          {children ?? (
            <EmptyWorkspace
              onNewSong={() => setIsNewSongOpen(true)}
              onShowTips={() => setIsTipsOpen(true)}
            />
          )}
        </main>
      </div>

      <NewSongDialog
        open={isNewSongOpen}
        onClose={() => setIsNewSongOpen(false)}
        onCreate={handleCreateSong}
      />
      <ShareDialog song={currentSong} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <OnboardingDialog open={isTipsOpen} onOpenChange={setIsTipsOpen} autoShow />
    </div>
  );
}
