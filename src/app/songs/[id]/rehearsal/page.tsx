import { AuthGate } from "@/components/AuthGate";
import { RehearsalView } from "@/components/RehearsalView";

type RehearsalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RehearsalPage({ params }: RehearsalPageProps) {
  const { id } = await params;

  return (
    <AuthGate>
      <RehearsalView songId={id} />
    </AuthGate>
  );
}
