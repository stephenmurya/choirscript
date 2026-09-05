import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { WorkspaceSongsProvider } from "@/components/WorkspaceSongsContext";

/**
 * Authenticated application shell: persists across Home, Songs, Recent and
 * Settings. AuthGate handles auth states + migration gate;
 * WorkspaceSongsProvider performs the single one-time song-metadata query
 * shared by the sidebar, Home, Songs and Recent.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <WorkspaceSongsProvider>
        <AppShell>{children}</AppShell>
      </WorkspaceSongsProvider>
    </AuthGate>
  );
}
