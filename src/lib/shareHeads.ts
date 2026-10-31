"use client";

import { getFirebaseFirestore } from "@/lib/firebase/client";

/**
 * Live share doorbells.
 *
 * A shared rehearsal page used to poll `/api/share/<id>/rev` every few seconds.
 * Instead, the editor rings a tiny Firestore document after each publish and
 * every open page holds one snapshot listener on it: Firestore pushes the write,
 * nothing is sent while the song is idle.
 *
 * The document is advisory, never authoritative: it carries a revision counter.
 * The Blob payload behind /api/share is what actually renders, so a stale or
 * bogus doorbell costs one wasted fetch and nothing more.
 */

export type ShareHead = {
  revision: number;
  updatedAt: string;
};

function normalizeHead(data: Record<string, unknown> | undefined): ShareHead | null {
  if (!data || typeof data.revision !== "number") {
    return null;
  }

  return {
    revision: data.revision,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

/** Ring the doorbell after a successful publish. Best effort by design. */
export async function publishShareHead(
  shareId: string,
  revision: number,
  updatedAt: string,
): Promise<void> {
  if (!shareId || typeof revision !== "number") {
    return;
  }

  try {
    const [{ doc, setDoc }, db] = await Promise.all([
      import("firebase/firestore"),
      getFirebaseFirestore(),
    ]);

    await setDoc(doc(db, "shareHeads", shareId), { shareId, revision, updatedAt });
  } catch (error) {
    // The link is still correct: viewers catch the new revision on focus. A
    // failed doorbell must never surface as an error to the editor.
    console.warn("Share doorbell write failed", error);
  }
}

/**
 * Subscribe to a share's doorbell. Returns an unsubscribe function that is safe
 * to call before the (dynamic) Firestore import has finished.
 *
 * Resolves silently when Firebase is unconfigured, the rules reject the read, or
 * the device is offline — the page then falls back to the focus catch-up.
 */
export function subscribeShareHead(
  shareId: string,
  onBump: (head: ShareHead) => void,
): () => void {
  let stop: () => void = () => {};
  let cancelled = false;

  void (async () => {
    try {
      // Keep the Firestore SDK out of the first-load bundle: a rehearsal page on
      // a phone should render the lyrics before it downloads a realtime client.
      const [{ doc, onSnapshot }, db] = await Promise.all([
        import("firebase/firestore"),
        getFirebaseFirestore(),
      ]);

      if (cancelled) {
        return;
      }

      stop = onSnapshot(
        doc(db, "shareHeads", shareId),
        (snapshot) => {
          const head = normalizeHead(snapshot.data());

          if (head) {
            onBump(head);
          }
        },
        (error) => {
          console.warn("Share doorbell listener stopped", error);
        },
      );
    } catch (error) {
      console.warn("Share doorbell unavailable", error);
    }
  })();

  return () => {
    cancelled = true;
    stop();
  };
}
