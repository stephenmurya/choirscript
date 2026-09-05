import { AuthGate } from "@/components/AuthGate";
import { SongDashboard } from "@/components/SongDashboard";

export default function Home() {
  return (
    <AuthGate>
      <SongDashboard />
    </AuthGate>
  );
}
