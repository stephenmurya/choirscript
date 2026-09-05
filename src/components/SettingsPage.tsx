"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import {
  getUserProfile,
  renameWorkspace,
  updateUserDisplayName,
} from "@/lib/firebase/workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/**
 * Settings foundation (`/settings`): account (read-only email, editable
 * display name, sign out) and workspace identity (rename). Deliberately small
 * — no members, invitations, billing or deletion in this phase.
 */
export function SettingsPage() {
  const router = useRouter();
  const { user, workspace, setWorkspace } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Seed the editable fields from the authoritative documents (the auth
    // displayName may lag the Firestore profile).
    getUserProfile(user?.uid ?? "")
      .then((profile) => {
        if (!cancelled) {
          setDisplayName(profile?.displayName || user?.displayName || "");
          setProfileLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Could not load profile", error);
        if (!cancelled) {
          setDisplayName(user?.displayName || "");
          setProfileLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName]);

  // Keep the editable field in sync with the workspace doc without a
  // setState-in-effect: derive during render, write back only on user input.
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState<string | null>(null);
  const workspaceName = workspaceNameDraft ?? (workspace?.name ?? "");

  function handleWorkspaceNameChange(value: string) {
    setWorkspaceNameDraft(value);
  }

  async function handleSaveDisplayName() {
    if (!user) {
      return;
    }

    setIsSavingName(true);

    try {
      await updateUserDisplayName(user.uid, displayName, {
        workspaceId: workspace?.id,
      });
      // Refresh the auth user so navbar/avatar identity reflects the new
      // name immediately (Firebase Auth profile was updated server-side by
      // the helper; reload() makes currentUser pick it up).
      await user.reload();
      toast.success("Display name updated");
    } catch (error) {
      console.error("Could not update display name", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update your display name.",
      );
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSaveWorkspaceName() {
    if (!workspace) {
      return;
    }

    setIsSavingWorkspace(true);

    try {
      const appliedName = await renameWorkspace(workspace.id, workspaceName);
      // Update the cached workspace doc so the shell reflects the new name
      // immediately without an extra read.
      setWorkspace({ ...workspace, name: appliedName });
      toast.success("Workspace name updated");
    } catch (error) {
      console.error("Could not rename workspace", error);
      toast.error(
        error instanceof Error ? error.message : "Could not rename the workspace.",
      );
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  function handleSignOut() {
    signOutUser()
      .then(() => router.push("/login"))
      .catch((signOutError) => {
        console.error("Sign out failed", signOutError);
        toast.error("Sign out failed. Please try again.");
      });
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account and workspace basics. More workspace management arrives in a later phase.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        {/* ACCOUNT */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>How you appear in ChoirScript.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar-accent text-lg font-semibold text-sidebar-accent-foreground">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="size-14"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (user?.displayName || user?.email || "?").charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.displayName || "No display name"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{user?.email || "—"}</p>
              </div>
            </div>

            <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              Email
              <Input value={user?.email ?? ""} readOnly disabled />
              <span className="text-xs font-normal text-muted-foreground">
                Managed by your sign-in provider and can&apos;t be changed here.
              </span>
            </Label>

            <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              Display name
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                disabled={!profileLoaded}
              />
            </Label>

            <div>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDisplayName}
                disabled={isSavingName || !profileLoaded || !displayName.trim()}
              >
                {isSavingName ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                Save display name
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Sign out of ChoirScript.</p>
              <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut data-icon="inline-start" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WORKSPACE */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              The shared space that holds your songs. Switching workspaces arrives in a later
              phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              Workspace name
              <Input
                value={workspaceName}
                onChange={(event) => handleWorkspaceNameChange(event.target.value)}
                placeholder="My Workspace"
                disabled={!workspace}
              />
            </Label>
            <div>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveWorkspaceName}
                disabled={
                  isSavingWorkspace ||
                  !workspace ||
                  !workspaceName.trim() ||
                  workspaceName.trim() === (workspace?.name ?? "")
                }
              >
                {isSavingWorkspace ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : null}
                Save workspace name
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
