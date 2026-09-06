"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Copy, Ellipsis, Eye, Printer, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Song } from "@/lib/songTypes";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { ShareDialog } from "./ShareDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type EditorShellProps = {
  song: Song | null;
  saveStatus: string;
  activeView: "lyrics" | "parts";
  children: ReactNode;
};

export function EditorShell({ song, saveStatus, activeView, children }: EditorShellProps) {
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

  return (
    <div className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1400px] items-center gap-2 px-3 sm:px-5 lg:px-8">
          <Button render={<Link href="/" />} variant="ghost" size="icon-sm" aria-label="Back to workspace"><ArrowLeft /></Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{song?.title || "Untitled Song"}</p>
            <div className="flex items-center gap-2"><Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{saveStatus}</Badge><span className="hidden text-xs text-muted-foreground sm:inline">Autosaved</span></div>
          </div>
          {song ? <nav className="hidden items-center gap-1 md:flex" aria-label="Editor views">
            <Button render={<Link href={`/songs/${song.id}?view=lyrics`} />} variant={activeView === "lyrics" ? "secondary" : "ghost"} size="sm">Lyrics</Button>
            <Button render={<Link href={`/songs/${song.id}?view=parts`} />} variant={activeView === "parts" ? "secondary" : "ghost"} size="sm">Parts</Button>
          </nav> : null}
          <div className="ml-auto flex items-center gap-1">
            {song ? <>
              <Button render={<Link href={`/songs/${song.id}/rehearsal`} />} size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm"><Eye /><span className="hidden sm:inline">Rehearsal</span></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsShareOpen(true)} aria-label="Share"><Share2 /></Button>
              <Button render={<Link href={`/songs/${song.id}/rehearsal`} />} variant="ghost" size="icon-sm" aria-label="Print"><Printer /></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleDuplicate} aria-label="Duplicate"><Copy /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="More actions" />}><Ellipsis /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsShareOpen(true)}><Share2 />Share</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}><Copy />Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteOpen(true)}><Trash2 />Delete song</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> : null}
          </div>
        </div>
        {song ? <nav className="flex items-center gap-1 border-t border-border/60 px-3 py-1.5 md:hidden" aria-label="Editor views">
          <Button render={<Link href={`/songs/${song.id}?view=lyrics`} />} variant={activeView === "lyrics" ? "secondary" : "ghost"} size="sm" className="flex-1">Lyrics</Button>
          <Button render={<Link href={`/songs/${song.id}?view=parts`} />} variant={activeView === "parts" ? "secondary" : "ghost"} size="sm" className="flex-1">Parts</Button>
        </nav> : null}
      </header>
      <main className="min-w-0 overflow-x-hidden">{children}</main>
      <ShareDialog song={song} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <ConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={`Delete ${song?.title || "Untitled Song"}?`} description="This removes the song from your workspace and cannot be undone." confirmLabel="Delete song" destructive onConfirm={handleDelete} />
    </div>
  );
}
