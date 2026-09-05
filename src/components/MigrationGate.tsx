"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { hasLegacyData, runLegacyMigrationOnce } from "@/lib/firebase/migration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MigrationGateStatus = "checking" | "migrating" | "complete" | "failed";

type MigrationGateProps = {
  children: ReactNode;
};

function GateScreen({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {action ? <CardContent>{action}</CardContent> : null}
      </Card>
    </main>
  );
}

/**
 * Post-auth, post-workspace legacy migration gate.
 *
 * Mounted inside AuthGate on all protected cloud-backed routes (`/`,
 * `/songs/[id]`, `/songs/[id]/rehearsal`), so migration happens before any
 * protected resource loads — including direct deep-link navigation.
 *
 * States: checking -> migrating -> complete (renders children) | failed
 * (retryable; local data untouched). Public `/s/[shareId]` does not mount
 * this component and never runs migration.
 *
 * Duplicate concurrent runs are prevented inside the migration module itself
 * (single-flight promise), and this gate only starts the run once per mount.
 */
export function MigrationGate({ children }: MigrationGateProps) {
  const { user, workspaceId } = useAuth();
  const [status, setStatus] = useState<MigrationGateStatus>("checking");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !workspaceId) {
      return;
    }

    let cancelled = false;

    // Avoid synchronous setState in the effect body (React compiler rule).
    Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }

      // Fast path: no legacy key at all — skip straight to complete without
      // touching Firestore or showing a migrating state.
      if (!hasLegacyData()) {
        setStatus("complete");
        return;
      }

      setStatus("migrating");

      runLegacyMigrationOnce(workspaceId, uid)
        .then((migrationResult) => {
          if (cancelled) {
            return;
          }

          if (migrationResult.status === "failed") {
            setFailureMessage(
              migrationResult.error ||
                "Local song import failed. Your local data is untouched.",
            );
            setStatus("failed");
            return;
          }

          if (migrationResult.status === "migrated" && migrationResult.imported > 0) {
            toast.success(
              `Imported ${migrationResult.imported} local song${
                migrationResult.imported === 1 ? "" : "s"
              } to your workspace`,
            );
          }

          setStatus("complete");
        })
        .catch((error) => {
          console.error("Legacy migration failed", error);
          if (!cancelled) {
            setFailureMessage(
              error instanceof Error
                ? error.message
                : "Local song import failed. Your local data is untouched.",
            );
            setStatus("failed");
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [uid, workspaceId, attempt]);

  function handleRetry() {
    setFailureMessage(null);
    setStatus("checking");
    setAttempt((value) => value + 1);
  }

  if (status === "checking") {
    return (
      <main className="grid min-h-svh place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            CS
          </span>
          <p className="text-sm">Checking your workspace...</p>
        </div>
      </main>
    );
  }

  if (status === "migrating") {
    return (
      <main className="grid min-h-svh place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Importing your local songs...</p>
        </div>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <GateScreen
        title="Local songs couldn't be imported"
        description={failureMessage ?? "Your local data is untouched and can be retried."}
        action={
          <div className="flex flex-col items-center gap-2">
            <Button type="button" onClick={handleRetry}>
              Retry import
            </Button>
            <p className="text-xs text-muted-foreground">
              Successfully imported songs won&apos;t be duplicated on retry.
            </p>
          </div>
        }
      />
    );
  }

  // complete — children may want the result (e.g. dashboard refresh trigger).
  return <>{children}</>;
}
