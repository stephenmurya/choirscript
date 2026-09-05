import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch, type Firestore } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore, getInitializedFirebaseAuth } from "./client";
import type { UserProfile, WorkspaceMember, WorkspaceRole } from "./types";

export type AuthResult = {
  user: User;
  profile: UserProfile;
  workspaceId: string;
};

/** Raw Firebase error code for diagnostics (dev logging), unmapped. */
export function describeAuthErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return error instanceof Error ? error.name : String(error);
}

/** Human-readable messages for Firebase auth error codes. */
export function describeAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try signing in instead.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 6 characters.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled yet for the app.";
    default:
      if (code.startsWith("auth/")) {
        return "Sign-in failed. Please try again.";
      }
      return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }
}

// ---------------------------------------------------------------------------
// Development-only bootstrap diagnostics. Console noise in dev; stripped from
// production builds via the static boolean check below.
// ---------------------------------------------------------------------------

const BOOTSTRAP_DEBUG =
  process.env.NODE_ENV === "development" && typeof window !== "undefined";

function logBootstrap(step: string, detail?: string) {
  if (BOOTSTRAP_DEBUG) {
    console.log(`[bootstrap] ${step}${detail ? `: ${detail}` : ""}`);
  }
}

function describeFirestoreErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return error instanceof Error ? error.message : String(error);
}

async function ensureUserProfile(
  db: Firestore,
  user: User,
): Promise<UserProfile> {
  const profileRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();
  const fallbackName = user.email?.split("@")[0] ?? "Choir Director";

  logBootstrap("reading user profile", `users/${user.uid}`);
  const snapshot = await getDoc(profileRef);
  logBootstrap("user profile read succeeded", snapshot.exists() ? "exists" : "does not exist");

  if (!snapshot.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || fallbackName,
      email: user.email ?? "",
      photoURL: user.photoURL ?? undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Fixed document id (uid) makes concurrent creation idempotent: two tabs
    // racing simply write the same document with equivalent content.
    logBootstrap("creating user profile");
    await setDoc(profileRef, profile);
    logBootstrap("user profile created");
    return profile;
  }

  const existing = snapshot.data() as UserProfile;

  // Keep the profile in sync with auth provider details without rewriting
  // user-owned fields (defaultWorkspaceId).
  if (
    existing.displayName !== (user.displayName || fallbackName) ||
    existing.photoURL !== (user.photoURL ?? undefined)
  ) {
    const updated: UserProfile = {
      ...existing,
      displayName: user.displayName || fallbackName,
      photoURL: user.photoURL ?? undefined,
      updatedAt: now,
    };

    logBootstrap("syncing user profile from auth provider");
    await setDoc(profileRef, updated);
    logBootstrap("user profile synced");
    return updated;
  }

  return existing;
}

/**
 * Deterministic default workspace ID per user. Because the ID is derived from
 * the uid, two concurrent bootstrap attempts (e.g. two tabs signing in to a
 * brand-new account) write the SAME document id rather than two different
 * workspaces — the second write is a no-op overwrite of identical data, which
 * makes bootstrap atomic/idempotent without needing Firestore transactions to
 * serialize creation. It also lets the security rules verify self-created
 * membership without reading a workspace doc written in the same batch.
 */
function defaultWorkspaceId(uid: string): string {
  return `default-${uid}`;
}

async function ensureDefaultWorkspace(
  db: Firestore,
  user: User,
  profile: UserProfile,
): Promise<string> {
  const now = new Date().toISOString();
  const workspaceId = defaultWorkspaceId(user.uid);
  const workspaceRef = doc(db, "workspaces", workspaceId);
  const profileRef = doc(db, "users", user.uid);

  logBootstrap("reading default workspace", `workspaces/${workspaceId}`);
  const workspaceSnapshot = await getDoc(workspaceRef);
  logBootstrap(
    "default workspace read succeeded",
    workspaceSnapshot.exists() ? "exists" : "does not exist",
  );

  if (workspaceSnapshot.exists()) {
    // Ensure the profile points at it (self-heals a profile whose pointer is
    // missing or stale, e.g. after rules rejected an earlier bootstrap).
    if (!profile.defaultWorkspaceId) {
      logBootstrap("linking profile to existing default workspace");
      await setDoc(
        profileRef,
        { defaultWorkspaceId: workspaceId, updatedAt: now },
        { merge: true },
      );
      logBootstrap("profile linked");
    }
    return workspaceId;
  }

  // First bootstrap for this user. Deterministic ID + setDoc means a
  // concurrent attempt either loses the race (its write lands as an identical
  // overwrite of the same document) or wins it — exactly one workspace exists
  // either way, with the same ID.
  const member: WorkspaceMember = {
    uid: user.uid,
    role: "owner" as WorkspaceRole,
    displayName: profile.displayName,
    email: profile.email,
    createdAt: now,
    updatedAt: now,
  };

  logBootstrap(
    "creating default workspace batch",
    `workspaces/${workspaceId} + members/${user.uid} + profile link`,
  );
  const batch = writeBatch(db);
  batch.set(workspaceRef, {
    id: workspaceId,
    name: "My Workspace",
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(doc(db, "workspaces", workspaceId, "members", user.uid), member);
  batch.set(
    profileRef,
    { defaultWorkspaceId: workspaceId, updatedAt: now },
    { merge: true },
  );

  await batch.commit();
  logBootstrap("default workspace batch committed");

  return workspaceId;
}

/**
 * Idempotent post-authentication bootstrap: ensures the user profile doc and
 * exactly one default workspace (+ owner membership) exist. Safe to call on
 * every sign-in — subsequent logins will not create duplicates.
 *
 * Each Firestore operation below is individually logged (dev builds only) so
 * a first-login rules failure pinpoints the exact failing operation instead
 * of surfacing as one generic error.
 */
export async function bootstrapUserWorkspace(user: User): Promise<AuthResult> {
  const db = await getFirebaseFirestore();
  logBootstrap("starting", user.uid);
  const profile = await ensureUserProfile(db, user);
  const workspaceId = await ensureDefaultWorkspace(db, user, profile);
  logBootstrap("complete", `workspaceId=${workspaceId}`);

  return { user, profile, workspaceId };
}

export { describeFirestoreErrorCode };

/**
 * Google popup sign-in.
 *
 * REQUIRES the caller to have awaited ensureFirebaseAuthReady() beforehand
 * (AuthProvider does this at mount, and LoginPage gates the Google button on
 * auth readiness). Reads the cached Auth instance synchronously and calls
 * signInWithPopup() with no awaits, dynamic imports, or initialization
 * promises in between — keeping the popup maximally coupled to the click's
 * transient user activation. Throws synchronously if Auth isn't ready yet.
 */
export function signInWithGoogle(): Promise<User> {
  const auth = getInitializedFirebaseAuth();

  if (!auth) {
    return Promise.reject(
      new Error("Sign-in is still initializing. Please try again in a moment."),
    );
  }

  const provider = new GoogleAuthProvider();

  // NOTE: no awaits / dynamic imports / init promises between here and the
  // popup call — the popup must be attributable to the user gesture.
  return signInWithPopup(auth, provider)
    .then((credential) => credential.user)
    .catch((error) => {
    // TEMPORARY (production diagnostics): log the raw Firebase code so
    // auth/popup-blocked vs auth/unauthorized-domain vs
    // auth/popup-closed-by-user is distinguishable in the deployed console.
    // Remove once the sign-in issue is resolved. No tokens/secrets are logged.
    console.error(`[google-signin] ${describeAuthErrorCode(error)}`, error);
    throw error;
  });
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = await getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  const auth = await getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }

  return credential.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = await getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser(): Promise<void> {
  const auth = await getFirebaseAuth();
  await signOut(auth);
}
