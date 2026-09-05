"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Clock as ClockIcon, CloudOff, Library, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useWorkspaceSongs } from "./WorkspaceSongsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewSongDialog } from "./NewSongDialog";
import { OnboardingDialog } from "./OnboardingDialog";

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Workspace Home (`/`): identity, contextual greeting, primary creation
 * action, recent songs. Metadata only — no song bodies are read.
 */
export function WorkspaceHomePage() {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { recentSongs, songs, isLoading, error, reload, createSong } = useWorkspaceSongs();
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const firstName = user?.displayName?.split(" ")[0] ?? null;
  const workspaceName = workspace?.name || "My Workspace";

  async function handleQuickCreate() {
    setIsCreating(true);

    try {
      const meta = await createSong({ title: "Untitled Song" });
      if (meta) {
        router.push(`/songs/${meta.id}`);
      }
    } catch (createError) {
      console.error("Could not create song", createError);
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Could not create the song. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {workspaceName}
          </p>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {songs.length === 0
              ? "Set up your first rehearsal script and it will live here."
              : songs.length === 1
                ? "1 song in this workspace."
                : `${songs.length} songs in this workspace.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" onClick={() => setIsNewSongOpen(true)}>
            <Plus data-icon="inline-start" />
            New song
          </Button>
          <Button render={<Link href="/songs" />} variant="outline" size="sm">
            <Library data-icon="inline-start" />
            All songs
          </Button>
        </div>
      </header>

      {/* Error / loading */}
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

      {/* Empty state doubles as onboarding surface */}
      {!isLoading && !error && songs.length === 0 ? (
        <Card className="mt-10 border-border/70 bg-card/80 shadow-2xl shadow-background/20">
          <CardHeader>
            <CardTitle className="text-2xl">Start your first song</CardTitle>
            <CardDescription>
              ChoirScript keeps annotated rehearsal scripts for your choir — lyrics, SATB cues,
              techniques, and timing — saved to the {workspaceName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => setIsNewSongOpen(true)}>
              <Plus data-icon="inline-start" />
              New song
            </Button>
            <Button type="button" variant="outline" onClick={handleQuickCreate} disabled={isCreating}>
              {isCreating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              Quick start (no details yet)
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsTipsOpen(true)}>
              Show tips
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent songs */}
      {songs.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <ClockIcon className="size-4" />
              Recent songs
            </h2>
            <Link
              href="/songs/recent"
              className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading songs...
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentSongs.map((song) => (
                <Link
                  key={song.id}
                  href={`/songs/${song.id}`}
                  className="group rounded-2xl border border-border bg-card/70 p-4 transition hover:border-sidebar-accent hover:bg-sidebar-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {song.title || "Untitled Song"}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {song.mode === "advanced" ? "Timed" : "Simple"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[song.artist, song.key, song.tempo].filter(Boolean).join(" / ") || "No details"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {formatUpdated(song.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <NewSongDialog
        open={isNewSongOpen}
        onClose={() => setIsNewSongOpen(false)}
        onCreate={(metadata) => {
          setIsNewSongOpen(false);
          handleCreateFromDialog(metadata);
        }}
      />
      <OnboardingDialog open={isTipsOpen} onOpenChange={setIsTipsOpen} />
    </div>
  );

  async function handleCreateFromDialog(
    metadata: Parameters<typeof createSong>[0],
  ) {
    try {
      const meta = await createSong(metadata);
      if (meta) {
        router.push(`/songs/${meta.id}`);
      }
    } catch (createError) {
      console.error("Could not create song", createError);
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Could not create the song. Please try again.",
      );
    }
  }
}
