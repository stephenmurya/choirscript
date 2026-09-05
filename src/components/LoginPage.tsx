"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  describeAuthError,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type LoginMode = "signin" | "signup" | "reset";

const initialState = { email: "", password: "", displayName: "" };

export function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("signin");
  const [form, setForm] = useState(initialState);
  const [isBusy, setIsBusy] = useState(false);
  const [resetSentByMode, setResetSentByMode] = useState<Record<LoginMode, boolean>>({
    signin: false,
    signup: false,
    reset: false,
  });
  const resetSent = resetSentByMode[mode];

  function updateField(field: keyof typeof initialState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(form.email.trim(), form.password);
      } else if (mode === "signup") {
        await signUpWithEmail(form.email.trim(), form.password, form.displayName);
      } else {
        await requestPasswordReset(form.email.trim());
        setResetSentByMode((current) => ({ ...current, reset: true }));
        toast.success("Password reset email sent");
        setIsBusy(false);
        return;
      }

      router.push("/");
    } catch (error) {
      toast.error(describeAuthError(error));
      setIsBusy(false);
    }
  }

  async function handleGoogle() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      await signInWithGoogle();
      router.push("/");
    } catch (error) {
      toast.error(describeAuthError(error));
      setIsBusy(false);
    }
  }

  const title = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";
  const description =
    mode === "signin"
      ? "Access your cloud-backed choir scripts."
      : mode === "signup"
        ? "Create an account to save your scripts to the cloud."
        : "We'll email you a link to set a new password.";

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            CS
          </span>
          <span className="text-lg font-semibold">ChoirScript</span>
        </Link>

        <Card className="border-border/70 bg-card/80 shadow-2xl shadow-background/20">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={isBusy}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81" />
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {resetSent ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                If an account exists for {form.email.trim()}, a password reset email is on its
                way. Check your inbox.
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" ? (
                <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                  Name
                  <Input
                    value={form.displayName}
                    onChange={(event) => updateField("displayName", event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </Label>
              ) : null}

              <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                Email
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Label>

              {mode !== "reset" ? (
                <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
                  Password
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </Label>
              ) : null}

              <Button type="submit" className="w-full" disabled={isBusy}>
                {isBusy
                  ? "Working..."
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset email"}
              </Button>
            </form>

            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => setMode("reset")}
                  >
                    Forgot your password?
                  </button>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Need an account? Create one
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
