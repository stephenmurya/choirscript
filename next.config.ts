import type { NextConfig } from "next";

const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    if (!firebaseProjectId) {
      return [];
    }

    // Keep Firebase's redirect helper on the same origin as ChoirScript.
    // This prevents browsers from dropping the returned Google session when
    // third-party storage is blocked.
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
