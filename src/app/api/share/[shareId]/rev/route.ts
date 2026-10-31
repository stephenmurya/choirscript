import { getSharedRevision, validateShareId } from "@/lib/share-store";

// Poll target: must never be cached, or viewers never see an update.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ shareId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { shareId } = await params;

  if (!validateShareId(shareId)) {
    return Response.json({ error: "Share not found." }, { status: 404 });
  }

  const revision = await getSharedRevision(shareId);

  if (!revision) {
    return Response.json({ error: "Share not found." }, { status: 404 });
  }

  return Response.json(revision, {
    headers: { "cache-control": "no-store" },
  });
}
