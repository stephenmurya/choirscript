"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock as ClockIcon,
  CloudOff,
  Copy,
  Eye,
  HelpCircle as HelpCircleIcon,
  House,
  Library,
  Loader2,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Printer,
  Search,
  Settings as SettingsIcon,
  Share2,
  Trash,
} from "lucide-react";
import type { Song } from "@/lib/songTypes";
import type { SongMeta } from "@/lib/firebase/types";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House, match: (path: string) => path === "/" },
  {
    href: "/songs",
    label: "Songs",
    icon: Library,
    // Editor routes keep Songs highlighted without matching /songs/recent.
    match: (path: string) => path.startsWith("/songs") && path !== "/songs/recent",
  },
  {
    href: "/songs/recent",
    label: "Recent",
    icon: ClockIcon,
    match: (path: string) => path === "/songs/recent",
  },
] as const;

export function AppShell({
  activeSongId = null,
  currentSong = null,
  saveStatus,
  onSave,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, workspace } = useAuth();
  const {
    songs,
    recentSongs,
    isLoading,
    error,
    reload,
    createSong,
    duplicateSong,
    deleteSong,
  } = useWorkspaceSongs();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  const isHome = pathname === "/";

  // Songs in the sidebar list: search-filtered; hidden on Home where the page
  // provides its own content instead of competing song lists.
  const sidebarSongs = searchQuery.trim()
    ? songs.filter((song) =>
        [song.title, song.artist, song.key, song.tempo]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())),
      )
    : recentSongs;

  async function handleCreateSong(
    metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
  ) {
    try {
      const meta = await createSong(metadata);
      if (!meta) {
        toast.error("Still loading your workspace. Please try again in a moment.");
        return;
      }
      setIsNewSongOpen(false);
      setIsSidebarOpen(false);
      router.push(`/songs/${meta.id}`);
    } catch (createError) {
      console.error("Could not create song", createError);
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Could not create the song. Please try again.",
      );
    }
  }

  async function handleDuplicate(songMeta: SongMeta) {
    try {
      const copyMeta = await duplicateSong(songMeta.id);
      if (copyMeta) {
        router.push(`/songs/${copyMeta.id}`);
      }
    } catch (duplicateError) {
      console.error("Could not duplicate song", duplicateError);
      toast.error(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Could not duplicate the song. Please try again.",
      );
    }
  }

  async function handleDelete(songMeta: SongMeta) {
    if (!window.confirm(`Delete "${songMeta.title || "Untitled Song"}"?`)) {
      return;
    }

    try {
      await deleteSong(songMeta.id);
      if (songMeta.id === activeSongId) {
        router.push("/");
      }
    } catch (deleteError) {
      console.error("Could not delete song", deleteError);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the song. Please try again.",
      );
    }
  }

  function openShareDialog() {
    onSave?.();
    setIsShareOpen(true);
  }

  function metaFromSong(song: Song): SongMeta {
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      tempo: song.tempo,
      mode: song.mode,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
      createdBy: user?.uid ?? "",
      updatedBy: user?.uid ?? "",
      schemaVersion: 1,
    };
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
                {workspace?.name || "My Workspace"}
              </span>
            </span>
          </Link>

          <Button type="button" onClick={() => setIsNewSongOpen(true)} className="w-full">
            <Plus data-icon="inline-start" />
            New Song
          </Button>
        </div>

        <div className="px-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon data-icon="inline-start" />
                  {item.label}
                  {item.label === "Songs" ? (
                    <Badge variant="secondary" className="ml-auto">
                      {songs.length}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setIsTipsOpen(true)}
              className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <HelpCircleIcon data-icon="inline-start" />
              Tips / Help
            </button>
          </nav>
        </div>

        {!isHome ? (
          <>
            <Separator className="my-3" />

            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {searchQuery.trim() ? "Search results" : "Recent songs"}
              </span>
            </div>
            <div className="px-2 pb-2">
              <label className="relative block">
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
            </div>
            <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
              <div className="flex flex-col gap-1">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading songs...
                  </div>
                ) : error ? (
                  <div className="px-4 py-8 text-sm text-destructive">
                    <CloudOff className="mb-2 size-4" />
                    {error}
                    <button
                      type="button"
                      onClick={reload}
                      className="mt-2 block text-xs underline underline-offset-2 hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {sidebarSongs.map((song) => {
                      const isActive = song.id === activeSongId;

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
                              {songMetadata(song) || `Updated ${formatUpdated(song.updatedAt)}`}
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
                    {sidebarSongs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {searchQuery.trim() ? "No songs match that search." : "No songs yet."}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}

        <Separator className="my-3" />

        <div className="px-4 pb-4">
          <Link
            href="/settings"
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <SettingsIcon data-icon="inline-start" />
            Settings
          </Link>
          {user ? (
            <div className="mt-2 flex items-center gap-2 rounded-2xl px-2 py-1">
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
                  signOutUser().catch((signOutError) => {
                    console.error("Sign out failed", signOutError);
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
                {currentSong?.title || workspace?.name || "ChoirScript"}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {currentSong
                  ? songMetadata(currentSong) || "No metadata yet"
                  : workspace?.name || "Choir direction workspace"}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={openShareDialog}
                >
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
                      <DropdownMenuItem onClick={() => handleDuplicate(metaFromSong(currentSong))}>
                        <Copy data-icon="inline-start" />
                        Duplicate song
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsTipsOpen(true)}>
                        <HelpCircleIcon data-icon="inline-start" />
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
                        onClick={() => handleDelete(metaFromSong(currentSong))}
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
            <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-10 text-muted-foreground">
              Nothing to show here yet.
            </div>
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
