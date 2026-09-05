"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock as ClockIcon,
  CloudOff,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  Loader2,
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
} from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { createSong, deleteSong as deleteCloudSong, duplicateSong as duplicateCloudSong, listSongs } from "@/lib/firebase/songs";
import type { SongMeta } from "@/lib/firebase/types";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
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

function songMetadata(song: Pick<SongMeta, "artist" | "key" | "tempo">) {
  return [song.artist, song.key, song.tempo].filter(Boolean).join(" / ");
}

function sortSongMetas(songs: SongMeta[]) {
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
            Your rehearsal scripts are saved to your workspace in the cloud. Choose a song from
            the sidebar, or start a new document.
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
  const { user, workspaceId } = useAuth();
  const [songs, setSongs] = useState<SongMeta[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  // Load song metadata (one-time read) once the workspace is available.
  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setIsLoadingSongs(true);
      }
    });

    listSongs(workspaceId)
      .then((metas) => {
        if (!cancelled) {
          setSongs(sortSongMetas(metas));
          setCloudError(null);
        }
      })
      .catch((error) => {
        console.error("Could not load songs", error);
        if (!cancelled) {
          setCloudError(
            error instanceof Error
              ? error.message
              : "Could not load your songs. Check your connection and refresh.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSongs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

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

  function handleCreateSong(
    metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
  ) {
    if (!workspaceId || !user) {
      toast.error("Still loading your workspace. Please try again in a moment.");
      return;
    }

    const song: Song = {
      ...createEmptySong(),
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic insert; reconcile with the server-generated metadata.
    createSong(workspaceId, song, user.uid)
      .then((meta) => {
        setSongs((current) => sortSongMetas([meta, ...current.filter((item) => item.id !== meta.id)]));
        setIsNewSongOpen(false);
        setIsSidebarOpen(false);
        router.push(`/songs/${meta.id}`);
      })
      .catch((error) => {
        console.error("Could not create song", error);
        toast.error(
          error instanceof Error ? error.message : "Could not create the song. Please try again.",
        );
      });
  }

  function handleDuplicate(songMeta: SongMeta) {
    if (!workspaceId || !user) {
      return;
    }

    duplicateCloudSong(workspaceId, songMeta.id, user.uid)
      .then((copyMeta) => {
        setSongs((current) => sortSongMetas([copyMeta, ...current]));
        router.push(`/songs/${copyMeta.id}`);
      })
      .catch((error) => {
        console.error("Could not duplicate song", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not duplicate the song. Please try again.",
        );
      });
  }

  function handleDelete(songMeta: SongMeta) {
    if (!workspaceId) {
      return;
    }

    if (!window.confirm(`Delete "${songMeta.title || "Untitled Song"}"?`)) {
      return;
    }

    // Optimistic removal; restore on failure.
    const previousSongs = songs;
    setSongs((current) => current.filter((item) => item.id !== songMeta.id));

    deleteCloudSong(workspaceId, songMeta.id).catch((error) => {
      console.error("Could not delete song", error);
      setSongs(previousSongs);
      toast.error(
        error instanceof Error ? error.message : "Could not delete the song. Please try again.",
      );
    });

    if (songMeta.id === activeSongId) {
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
              <ClockIcon data-icon="inline-start" />
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
            {isLoadingSongs ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading songs...
              </div>
            ) : cloudError ? (
              <div className="px-4 py-8 text-sm text-destructive">
                <CloudOff className="mb-2 size-4" />
                {cloudError}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </ScrollArea>

        <Separator className="my-3" />

        <div className="px-4 pb-4">
          {user ? (
            <div className="flex items-center gap-2 rounded-2xl px-2 py-1">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="" className="size-8" referrerPolicy="no-referrer" />
                ) : (
                  (user.displayName || user.email || "?").charAt(0).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-sidebar-foreground">
                  {user.displayName || user.email}
                </span>
                {user.displayName && user.email ? (
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  signOutUser().catch((error) => {
                    console.error("Sign out failed", error);
                    toast.error("Sign out failed. Please try again.");
                  });
                }}
              >
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
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
                {currentSong ? songMetadata(currentSong) || "No metadata yet" : "Cloud choir scripts"}
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
                      <DropdownMenuItem
                        onClick={() =>
                          handleDuplicate({
                            id: currentSong.id,
                            title: currentSong.title,
                            artist: currentSong.artist,
                            key: currentSong.key,
                            tempo: currentSong.tempo,
                            mode: currentSong.mode,
                            createdAt: currentSong.createdAt,
                            updatedAt: currentSong.updatedAt,
                            createdBy: user?.uid ?? "",
                            updatedBy: user?.uid ?? "",
                            schemaVersion: 1,
                          })
                        }
                      >
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
                        onClick={() =>
                          handleDelete({
                            id: currentSong.id,
                            title: currentSong.title,
                            artist: currentSong.artist,
                            key: currentSong.key,
                            tempo: currentSong.tempo,
                            mode: currentSong.mode,
                            createdAt: currentSong.createdAt,
                            updatedAt: currentSong.updatedAt,
                            createdBy: user?.uid ?? "",
                            updatedBy: user?.uid ?? "",
                            schemaVersion: 1,
                          })
                        }
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
