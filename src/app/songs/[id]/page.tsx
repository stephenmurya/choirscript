import { AuthGate } from "@/components/AuthGate";
import { SongEditor } from "@/components/SongEditor";

type SongPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;

  return (
    <AuthGate>
      <SongEditor songId={id} />
    </AuthGate>
  );
}
