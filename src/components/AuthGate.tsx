"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { MigrationGate } from "./MigrationGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthGateProps = {
  children: ReactNode;
};

function FullPageMessage({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-sm font-semibold text-muted-foreground">
            CS
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {action ? <CardContent>{action}</CardContent> : null}
      </Card>
    </main>
  );
}

/**
 * Client-side auth gate: blocks rendering of authenticated content until
 * Firebase auth resolves, the default workspace is bootstrapped, and the
 * browser-local legacy migration check has completed. Prevents the dashboard
 * flashing before auth state is known and guarantees migration runs before
 * any protected resource loads, on every protected route.
 *
 * Public snapshot routes (/s/[shareId]) do not use this gate.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { status, bootstrapError, retryBootstrap } = useAuth();

  // Keep the document title stable regardless of auth state.
  useEffect(() => {
    if (status === "unauthenticated") {
      document.title = "Sign in — ChoirScript";
    }
  }, [status]);

  if (status === "loading") {
    return (
      <main className="grid min-h-svh place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            CS
          </span>
          <p className="text-sm">Loading ChoirScript...</p>
        </div>
      </main>
    );
  }

  if (status === "unconfigured") {
    return (
      <FullPageMessage
        title="Cloud sync isn't configured"
        description="This deployment is missing the Firebase environment variables (NEXT_PUBLIC_FIREBASE_*). See .env.example for the required settings."
      />
    );
  }

  if (status === "unauthenticated") {
    return (
      <FullPageMessage
        title="Sign in to continue"
        description="ChoirScript keeps your rehearsal scripts in your account's workspace."
        action={
          <Button render={<Link href="/login" />}>Go to sign in</Button>
        }
      />
    );
  }

  if (bootstrapError) {
    return (
      <FullPageMessage
        title="Couldn't load your workspace"
        description={bootstrapError}
        action={
          <div className="flex flex-col items-center gap-2">
            <Button type="button" onClick={retryBootstrap}>
              Try again
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => signOutUser().catch(() => undefined)}
            >
              Sign out
            </button>
          </div>
        }
      />
    );
  }

  return (
    <MigrationGate>{children}</MigrationGate>
  );
}
