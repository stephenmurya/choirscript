import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let appPromise: Promise<FirebaseApp> | null = null;

function getFirebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = (async () => {
      if (!isFirebaseConfigured()) {
        throw new Error(
          "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* environment variables.",
        );
      }

      if (getApps().length > 0) {
        return getApp();
      }

      return initializeApp(firebaseConfig as {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
      });
    })();
  }

  return appPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  const app = await getFirebaseApp();
  return getAuth(app);
}

// ---------------------------------------------------------------------------
// Synchronous access to an already-initialized Auth instance.
//
// signInWithPopup() must be invoked as directly as possible from the click
// gesture: every awaited Promise between the click and the popup call risks
// the browser expiring transient user activation (auth/popup-blocked in
// production, never reproducible on localhost where init is instant).
// Initialization is kicked off at mount time; the click path reads the cached
// instance synchronously.
// ---------------------------------------------------------------------------

let cachedAuth: Auth | null = null;
let authReadyPromise: Promise<Auth> | null = null;

/** Begin (or join) Firebase Auth initialization; resolves with the Auth instance. */
export function ensureFirebaseAuthReady(): Promise<Auth> {
  if (!authReadyPromise) {
    authReadyPromise = getFirebaseAuth().then((auth) => {
      cachedAuth = auth;
      return auth;
    });
  }

  return authReadyPromise;
}

/**
 * Synchronous accessor for the initialized Auth instance. Returns null until
 * ensureFirebaseAuthReady() has resolved — callers must gate UI (e.g. the
 * Google sign-in button) on a non-null value.
 */
export function getInitializedFirebaseAuth(): Auth | null {
  return cachedAuth;
}

export async function getFirebaseFirestore(): Promise<Firestore> {
  const app = await getFirebaseApp();

  // Safe for optional/undefined properties in the Song model (e.g. bass cues,
  // pickupBeats) — writes simply omit undefined fields instead of throwing.
  return initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
}
