"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Eye,
  FileText,
  ListMusic,
  Music2,
  PanelLeft,
  Printer,
  Share2,
  Trash,
} from "lucide-react";
import type { Song } from "@/lib/songTypes";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShareDialog } from "./ShareDialog";

type EditorShellProps = {
  song: Song | null;
  saveStatus: string;
  activeView: "source" | "arrangement";
  children: ReactNode;
};

/**
 * Focused editor shell: AppShell's top navbar plus a CURRENT-SONG sidebar
 * (Back to workspace, song identity, Source/Arrangement/Rehearsal navigation, Share /
 * Print / Duplicate actions, Delete in the danger zone). No song library in
 * the editor sidebar. The EDIT group is structured so Phase 3 can add
 * Source/Arrangement entries in the EDIT group.
 */
export function EditorShell({
  song,
  saveStatus,
  activeView,
  children,
}: EditorShellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { duplicateSong, deleteSong } = useWorkspaceSongs();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDuplicate() {
    if (!song) {
      return;
    }

    try {
      const copyMeta = await duplicateSong(song.id);
      if (copyMeta) {
        toast.success("Song duplicated");
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

  async function handleDelete() {
    if (!song) {
      return;
    }

    if (!window.confirm(`Delete "${song.title || "Untitled Song"}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteSong(song.id);
      router.push("/");
    } catch (deleteError) {
      console.error("Could not delete song", deleteError);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the song. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSignOut() {
    signOutUser().catch((signOutError) => {
      console.error("Sign out failed", signOutError);
      toast.error("Sign out failed. Please try again.");
    });
  }

  function renderSidebarContent() {
    return (
      <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-3">
          <Link
            href="/"
            className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft data-icon="inline-start" />
            My Workspace
          </Link>
        </div>

        {song ? (
          <>
            <div className="px-4 pb-3 pt-2">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {song.title || "Untitled Song"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {song.artist || "No artist"}
              </p>
              <Badge variant="secondary" className="mt-2">
                {saveStatus}
              </Badge>
            </div>

            <div className="px-3">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Edit
              </p>
              <nav className="flex flex-col gap-1">
                <Link
                  href={`/songs/${song.id}?view=source`}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${activeView === "source" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
                >
                  <FileText data-icon="inline-start" />
                  Source
                </Link>
                <Link
                  href={`/songs/${song.id}?view=arrangement`}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${activeView === "arrangement" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
                >
                  <ListMusic data-icon="inline-start" />
                  Arrangement
                </Link>
              </nav>

              <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Song
              </p>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    // Song details (title/artist/key/BPM/notes) are edited via
                    // the metadata panel inside the script — no separate page.
                    toast.info(
                      "Song details live in the script: open 'Import lyrics or edit metadata' at the top.",
                    );
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Music2 data-icon="inline-start" />
                  Song details
                </button>
                <Link
                  href={`/songs/${song.id}/rehearsal`}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Eye data-icon="inline-start" />
                  Rehearsal
                </Link>
              </nav>

              <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Actions
              </p>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Share2 data-icon="inline-start" />
                  Share
                </button>
                <Link
                  href={`/songs/${song.id}/rehearsal`}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Printer data-icon="inline-start" />
                  Print
                </Link>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Copy data-icon="inline-start" />
                  Duplicate
                </button>
              </nav>
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading song...</div>
        )}

        <div className="mt-auto px-3 pb-4">
          {song ? (
            <div className="border-t border-sidebar-border pt-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
              >
                <Trash data-icon="inline-start" />
                Delete song
              </button>
            </div>
          ) : null}
          <div className="mt-3 flex items-center gap-2 rounded-2xl px-2 py-1">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="size-8" referrerPolicy="no-referrer" />
              ) : (
                (user?.displayName || user?.email || "?").charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground">
              {user?.displayName || user?.email}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-background text-foreground lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="no-print hidden min-h-svh border-r border-sidebar-border bg-sidebar lg:block">
        {renderSidebarContent()}
      </aside>

      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-[20rem] max-w-[85vw] p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Song navigation</SheetTitle>
            <SheetDescription>Current song actions and account.</SheetDescription>
          </SheetHeader>
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur lg:hidden">
          <div className="flex min-h-14 items-center gap-2 px-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <PanelLeft />
              <span className="sr-only">Open song menu</span>
            </Button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {song?.title || "Untitled Song"}
            </p>
            <Badge variant="secondary">{saveStatus}</Badge>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden">{children}</main>
      </div>

      <ShareDialog song={song} open={isShareOpen} onOpenChange={setIsShareOpen} />
    </div>
  );
}
