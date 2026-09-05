import { redirect } from "next/navigation";

// Phase 2.1: `/` is the canonical workspace/song-library surface. This route
// remains temporarily for compatibility and redirects to the workspace.
export default function Songs() {
  redirect("/");
}
