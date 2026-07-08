import { RehearsalView } from "@/components/RehearsalView";

type RehearsalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RehearsalPage({ params }: RehearsalPageProps) {
  const { id } = await params;

  return <RehearsalView songId={id} />;
}
