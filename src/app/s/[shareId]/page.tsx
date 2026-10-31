import Link from "next/link";
import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { getSharedSong } from "@/lib/share-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SharedSongLive } from "@/components/SharedSongLive";

type SharedSongPageProps = {
  params: Promise<{ shareId: string }>;
};

/**
 * Dynamic browser/social preview for shared snapshots. Uses the actual shared
 * payload title; the payload fetch is deduped with the page render through
 * React cache() in share-store (one Blob GET per request).
 */
export async function generateMetadata({
  params,
}: SharedSongPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const payload = await getSharedSong(shareId);

  if (!payload) {
    return {
      title: "Shared rehearsal script | ChoirScript",
    };
  }

  const title = `${payload.title || "Untitled Song"} | ChoirScript`;
  const description = `View the rehearsal script for ${
    payload.title || "Untitled Song"
  } on ChoirScript.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      title,
      description,
    },
  };
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
                The link may have been removed or mistyped.
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

  // Everything below the fetch is live: the client component keeps the page in
  // sync with the song and swaps revisions in place, without a reload.
  return <SharedSongLive initialPayload={payload} />;
}
