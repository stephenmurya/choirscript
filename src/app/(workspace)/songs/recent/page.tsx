import { redirect } from "next/navigation";

// Phase 2.1: "Recent" is no longer a destination; the workspace lists songs
// updatedAt-descending by default. Kept temporarily as a redirect.
export default function Recent() {
  redirect("/");
}
