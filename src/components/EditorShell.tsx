"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Copy, Ellipsis, Eye, FileUp, Redo2, Settings2, Share2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Song, SongShare } from "@/lib/songTypes";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { ShareDialog } from "./ShareDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorNav, type EditorNavItem } from "./EditorNav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type { EditorNavItem };

type EditorShellProps = {
  song: Song | null;
  saveStatus: string;
  activeNav: EditorNavItem;
  onNavChange: (nav: EditorNavItem) => void;
  onImportLyrics: () => void;
  onOpenSettings: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onShareCreated?: (share: SongShare) => void;
  children: ReactNode;
};

export function EditorShell({
  song,
  saveStatus,
  activeNav,
  onNavChange,
  onImportLyrics,
  onOpenSettings,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onShareCreated,
  children,
}: EditorShellProps) {
  const router = useRouter();
  const { duplicateSong, deleteSong } = useWorkspaceSongs();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  async function handleDuplicate() {
    if (!song) return;
    try {
      const copyMeta = await duplicateSong(song.id);
      if (copyMeta) {
        toast.success("Song duplicated");
        router.push(`/songs/${copyMeta.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not duplicate the song.");
    }
  }

  async function handleDelete() {
    if (!song) return;
    try {
      await deleteSong(song.id);
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the song.");
    }
  }

  const saveLabel = saveStatus === "saving" ? "Saving…" : saveStatus === "failed" ? "Save failed" : saveStatus === "dirty" ? "Unsaved changes" : "Saved";

  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex min-h-16 items-center gap-2 px-3 sm:px-5 lg:px-6">
          <Button render={<Link href="/" />} variant="ghost" size="icon-sm" aria-label="Back to workspace"><ArrowLeft /></Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{song?.title || "Untitled Song"}</p>
            <div className="flex items-center gap-2"><Badge variant={saveStatus === "failed" ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px]">{saveLabel}</Badge></div>
          </div>
          {song ? <EditorNav activeNav={activeNav} onNavChange={onNavChange} /> : null}
          <div className="ml-auto flex items-center gap-1">
            {song ? <>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onImportLyrics} aria-label="Import lyrics from a file" title="Import lyrics from a file"><FileUp /></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Song settings" title="Song settings"><Settings2 /></Button>
              <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
              <Button type="button" variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={!canUndo} onClick={onUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 /></Button>
              <Button type="button" variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={!canRedo} onClick={onRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 /></Button>
              <Button render={<Link href={`/songs/${song.id}/rehearsal`} />} size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm"><Eye /><span className="hidden sm:inline">Rehearsal</span></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsShareOpen(true)} aria-label="Share" title="Share"><Share2 /></Button>
              <Button type="button" variant="ghost" size="icon-sm" className="hidden sm:inline-flex" onClick={handleDuplicate} aria-label="Duplicate song" title="Duplicate song"><Copy /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="More actions" />}><Ellipsis /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsShareOpen(true)}><Share2 />Share</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}><Copy />Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenSettings}><Settings2 />Song settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteOpen(true)}><Trash2 />Delete song</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> : null}
          </div>
        </div>
        {song ? <EditorNav activeNav={activeNav} onNavChange={onNavChange} variant="mobile" /> : null}
      </header>
      <main className="min-w-0 overflow-x-clip">{children}</main>
      <ShareDialog
        song={song}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        onShareCreated={onShareCreated}
      />
      <ConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={`Delete ${song?.title || "Untitled Song"}?`} description="This removes the song from your workspace and cannot be undone." confirmLabel="Delete song" destructive onConfirm={handleDelete} />
    </div>
  );
}
