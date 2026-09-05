import { SongEditor } from "@/components/SongEditor";
import { Suspense } from "react";

type SongPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<main className="grid min-h-svh place-items-center">Loading editor...</main>}>
      <SongEditor songId={id} />
    </Suspense>
  );
}
