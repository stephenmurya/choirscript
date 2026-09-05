import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getFirebaseAuth, getFirebaseFirestore } from "./client";
import type { UserProfile, Workspace } from "./types";

/**
 * Workspace/profile operations for the settings foundation and shell identity.
 * All writes stay within existing Phase 1 security rules (owner-only workspace
 * update, self-only profile update).
 */

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const db = await getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, "workspaces", workspaceId));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: workspaceId,
    name: typeof data.name === "string" ? data.name : "My Workspace",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

/** Rename the workspace. Returns the applied (trimmed) name. */
export async function renameWorkspace(
  workspaceId: string,
  rawName: string,
): Promise<string> {
  const name = rawName.trim();

  if (!name) {
    throw new Error("Workspace name can't be empty.");
  }
  if (name.length > 80) {
    throw new Error("Workspace name is too long (80 characters max).");
  }

  const db = await getFirebaseFirestore();

  await setDoc(
    doc(db, "workspaces", workspaceId),
    { name, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  return name;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = await getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    uid,
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    email: typeof data.email === "string" ? data.email : "",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
    defaultWorkspaceId:
      typeof data.defaultWorkspaceId === "string" ? data.defaultWorkspaceId : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

/**
 * Persist a display-name change with full consistency:
 * 1. users/{uid} — the canonical, reload-surviving profile (source of truth)
 * 2. Firebase Auth currentUser.displayName — keeps the signed-in identity in
 *    sync so auth-provider surfaces don't show a stale name
 * 3. workspaces/{wid}/members/{uid}.displayName — denormalized member info
 *
 * The Firestore write is the persistence guarantee; the other two are best
 * effort so an auth.write failure never loses the canonical change.
 */
export async function updateUserDisplayName(
  uid: string,
  displayName: string,
  options: { workspaceId?: string } = {},
): Promise<void> {
  const trimmed = displayName.trim();

  if (!trimmed) {
    throw new Error("Display name can't be empty.");
  }

  const db = await getFirebaseFirestore();

  // 1. Canonical profile write (rules: users/{uid} is self-writable).
  await setDoc(
    doc(db, "users", uid),
    { displayName: trimmed, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  // 2. Best-effort Firebase Auth profile sync (non-fatal).
  try {
    const auth = await getFirebaseAuth();
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: trimmed });
    }
  } catch (error) {
    console.error("Could not sync Firebase Auth displayName", error);
  }

  // 3. Best-effort member doc sync (non-fatal).
  if (options.workspaceId) {
    try {
      await setDoc(
        doc(db, "workspaces", options.workspaceId, "members", uid),
        { displayName: trimmed, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch (error) {
      console.error("Could not sync workspace member displayName", error);
    }
  }
}
