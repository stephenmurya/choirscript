import { SongEditor } from "@/components/SongEditor";

type SongPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;

  return <SongEditor songId={id} />;
}
