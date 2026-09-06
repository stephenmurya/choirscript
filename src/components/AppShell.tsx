"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { CircleHelp, House, MoreVertical, PanelLeft, Plus } from "lucide-react";
import type { Song } from "@/lib/songTypes";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  children?: ReactNode;
};

function songMetadata(song: Pick<Song, "artist" | "key" | "tempo">) {
  return [song.artist, song.key, song.tempo].filter(Boolean).join(" / ");
}

/**
 * Application shell: top navigation bar (identity left; Tips, Settings,
 * New Song, account avatar right). No workspace sidebar — the workspace page
 * itself is the song library. Used by the (workspace) layout and mounted by
 * SongEditor for the focused editor experience.
 */
export function AppShell({
  activeSongId = null,
  currentSong = null,
  children,
}: AppShellProps) {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { createSong } = useWorkspaceSongs();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  const isEditor = Boolean(activeSongId && currentSong);

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

  function handleSignOut() {
    signOutUser().catch((signOutError) => {
      console.error("Sign out failed", signOutError);
      toast.error("Sign out failed. Please try again.");
    });
  }

  function renderAccountButton() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
          <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="size-8" referrerPolicy="no-referrer" />
            ) : (
              (user?.displayName || user?.email || "?").charAt(0).toUpperCase()
            )}
          </span>
          <span className="sr-only">Account menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.displayName || "No display name"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function renderNavbar() {
    return (
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[1200px] items-center gap-2 px-3 sm:px-6">
          {/* LEFT: identity */}
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl px-1 py-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              CS
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                ChoirScript
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {workspace?.name || "My Workspace"}
              </span>
            </span>
          </Link>

          <div className="min-w-0 flex-1">
            {isEditor && currentSong ? (
              <>
                <p className="truncate text-sm font-medium text-foreground">
                  {currentSong.title || "Untitled Song"}
                </p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {songMetadata(currentSong) || "No metadata yet"}
                </p>
              </>
            ) : null}
          </div>

          {/* RIGHT: actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {/* Mobile drawer trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <PanelLeft />
              <span className="sr-only">Open menu</span>
            </Button>

            {/* Compact overflow on narrow screens */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="ghost" size="icon-sm" className="sm:hidden" />}
              >
                <MoreVertical />
                <span className="sr-only">More</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsTipsOpen(true)}>
                  <CircleHelp data-icon="inline-start" />
                  Tips / Help
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setIsTipsOpen(true)}
            >
              <CircleHelp data-icon="inline-start" />
              Tips
            </Button>
            <Button
              render={<Link href="/settings" />}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Settings
            </Button>

            <Button type="button" size="sm" onClick={() => setIsNewSongOpen(true)}>
              <Plus data-icon="inline-start" />
              New Song
            </Button>

            {renderAccountButton()}
          </div>
        </div>
      </header>
    );
  }

  function renderMobileNavSheet() {
    return (
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-[20rem] max-w-[85vw] p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>ChoirScript navigation</SheetTitle>
            <SheetDescription>Workspace navigation and account.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex flex-col gap-1 p-3">
              <Link
                href="/"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <House data-icon="inline-start" />
                My Workspace
              </Link>
            </div>
            <div className="mt-auto px-3 pb-4">
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsTipsOpen(true);
                }}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CircleHelp data-icon="inline-start" />
                Tips / Help
              </button>
              <Link
                href="/settings"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
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
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground">
                    {user.displayName || user.email}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
                    Sign out
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      {renderNavbar()}
      {renderMobileNavSheet()}

      <main className="min-w-0 overflow-x-clip">{children}</main>

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
