"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { bootstrapUserWorkspace } from "./auth";
import { ensureFirebaseAuthReady, isFirebaseConfigured } from "./client";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "unconfigured";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  workspaceId: string | null;
  /** Server-side failure during profile/workspace bootstrap, if any. */
  bootstrapError: string | null;
  /** Retry bootstrap after a failure. */
  retryBootstrap: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured() ? "loading" : "unconfigured",
  );
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    async function subscribe() {
      // Initializes Firebase Auth once at app start and caches the instance
      // for synchronous access by the Google popup click path.
      const auth = await ensureFirebaseAuthReady();

      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        if (cancelled) {
          return;
        }

        setUser(nextUser);

        if (!nextUser) {
          setWorkspaceId(null);
          setBootstrapError(null);
          setStatus("unauthenticated");
          return;
        }

        setStatus("loading");
        setBootstrapError(null);

        bootstrapUserWorkspace(nextUser)
          .then((result) => {
            if (cancelled) {
              return;
            }
            setWorkspaceId(result.workspaceId);
            setStatus("authenticated");
          })
          .catch((error) => {
            console.error("Workspace bootstrap failed", error);
            if (cancelled) {
              return;
            }
            // Auth succeeded but cloud bootstrap failed: keep the user signed
            // in but surface an explicit error instead of crashing.
            setBootstrapError(
              error instanceof Error
                ? error.message
                : "Could not load your workspace. Please try again.",
            );
            setStatus("authenticated");
          });
      });

      if (cancelled) {
        unsubscribe();
      }
    }

    subscribe().catch((error) => {
      console.error("Auth initialisation failed", error);
      if (!cancelled) {
        setStatus("unauthenticated");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt]);

  const retryBootstrap = useCallback(() => {
    setBootstrapAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, workspaceId, bootstrapError, retryBootstrap }),
    [status, user, workspaceId, bootstrapError, retryBootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }

  return context;
}
