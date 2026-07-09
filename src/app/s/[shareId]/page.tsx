import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getSharedSong } from "@/lib/share-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvancedTimingRehearsalView } from "@/components/AdvancedTimingRehearsalView";
import { ColorfulRehearsalView, type RehearsalDisplayToggles } from "@/components/ColorfulRehearsalView";
import { SharedPageActions } from "@/components/SharedPageActions";

type SharedSongPageProps = {
  params: Promise<{ shareId: string }>;
};

const sharedToggles: RehearsalDisplayToggles = {
  soprano: true,
  alto: true,
  tenor: true,
  bass: true,
  techniques: true,
  directorNotes: true,
  largeText: false,
  blackAndWhite: false,
};

function metadataLine(payload: Awaited<ReturnType<typeof getSharedSong>>) {
  if (!payload) {
    return "";
  }

  return [
    payload.artist ? `Singer: ${payload.artist}` : null,
    payload.key ? `Key: ${payload.key}` : null,
    payload.bpm ? `BPM: ${payload.bpm}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function SharedSongPage({ params }: SharedSongPageProps) {
  const { shareId } = await params;
  const payload = await getSharedSong(shareId);

  if (!payload) {
    return (
      <main className="min-h-svh bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-xl items-center">
          <Card className="w-full border-border/70 bg-card/80 text-center">
            <CardHeader>
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <FileQuestion className="size-5" />
              </div>
              <CardTitle>This ChoirScript link is unavailable.</CardTitle>
              <CardDescription>
                The snapshot may have been removed, mistyped, or never created.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/" />} variant="outline">
                Open ChoirScript
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const song = payload.song;

  return (
    <main className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="no-print border-b border-border bg-background/90 px-3 py-4 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                CS
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">ChoirScript</span>
                <span className="block text-xs text-muted-foreground">Shared rehearsal script</span>
              </span>
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-foreground">{payload.title}</h1>
              <Badge variant="outline">Read-only</Badge>
            </div>
            {metadataLine(payload) ? (
              <p className="mt-1 text-sm text-muted-foreground">{metadataLine(payload)}</p>
            ) : null}
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Anyone with this link can view this read-only snapshot. Changes to the original song
              do not update this link automatically.
            </p>
          </div>
          <SharedPageActions />
        </div>
      </header>

      {song.mode === "advanced" ? (
        <AdvancedTimingRehearsalView song={song} toggles={sharedToggles} />
      ) : (
        <ColorfulRehearsalView song={song} toggles={sharedToggles} />
      )}
    </main>
  );
}
