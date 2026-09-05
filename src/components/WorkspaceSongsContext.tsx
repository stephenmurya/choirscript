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
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  backfillSongCardSummary,
  createSong as createCloudSong,
  deleteSong as deleteCloudSong,
  duplicateSong as duplicateCloudSong,
  listSongs,
  needsSummaryBackfill,
} from "@/lib/firebase/songs";
import type { SongMeta } from "@/lib/firebase/types";
import type { Song } from "@/lib/songTypes";
import { createEmptySong } from "@/lib/songStorage";

export type SongsProviderState = {
  songs: SongMeta[];
  recentSongs: SongMeta[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  createSong: (
    metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
  ) => Promise<SongMeta | null>;
  duplicateSong: (songId: string) => Promise<SongMeta | null>;
  deleteSong: (songId: string) => Promise<boolean>;
};

const SongsContext = createContext<SongsProviderState | null>(null);

function sortSongMetas(songs: SongMeta[]) {
  return songs.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Workspace-level song metadata provider. ONE one-time Firestore query shared
 * by the sidebar, Home, Songs, Recent and creation flows — no duplicate reads
 * between surfaces, no realtime listeners, no polling, no song bodies.
 *
 * Mutations are optimistic; failures roll back and surface toasts here so
 * pages stay free of persistence logic.
 */
export function WorkspaceSongsProvider({ children }: { children: ReactNode }) {
  const { user, workspaceId } = useAuth();
  const [songs, setSongs] = useState<SongMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  const uid = user?.uid ?? null;
  const contributor = useMemo(
    () => ({
      uid: user?.uid ?? "",
      displayName: user?.displayName ?? "",
      photoURL: user?.photoURL ?? undefined,
    }),
    [user?.uid, user?.displayName, user?.photoURL],
  );

  // One-time metadata query per workspace (re-runs on reload()). Songs whose
  // metadata lacks a current-version card summary are backfilled in the
  // background: one document/current read + one metadata write each, once,
  // deduped per session. Cards render immediately from whatever metadata is
  // already present.
  useEffect(() => {
    if (!workspaceId || !uid) {
      return;
    }

    const stale = songs.filter(needsSummaryBackfill);

    if (stale.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.all(
      stale.map((meta) => backfillSongCardSummary(workspaceId, meta, contributor)),
    )
      .then((updatedMetas) => {
        if (cancelled) {
          return;
        }

        const updatedById = new Map(
          updatedMetas.filter(Boolean).map((meta) => [meta!.id, meta!]),
        );

        setSongs((current) =>
          current.map((song) => updatedById.get(song.id) ?? song),
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [workspaceId, uid, songs, contributor]);
  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setIsLoading(true);
      }
    });

    listSongs(workspaceId)
      .then((metas) => {
        if (!cancelled) {
          setSongs(sortSongMetas(metas));
          setError(null);
        }
      })
      .catch((loadError) => {
        console.error("Could not load songs", loadError);
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your songs. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, reloadAttempt]);

  const reload = useCallback(() => {
    setReloadAttempt((attempt) => attempt + 1);
  }, []);

  const createSong = useCallback(
    async (
      metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
    ): Promise<SongMeta | null> => {
      if (!workspaceId || !uid) {
        return null;
      }

      const song: Song = {
        ...createEmptySong(),
        ...metadata,
        updatedAt: new Date().toISOString(),
      };

      try {
        const meta = await createCloudSong(workspaceId, song, uid, { contributor });
        setSongs((current) =>
          sortSongMetas([meta, ...current.filter((item) => item.id !== meta.id)]),
        );
        return meta;
      } catch (createError) {
        console.error("Could not create song", createError);
        throw createError;
      }
    },
    [workspaceId, uid, contributor],
  );

  const duplicateSong = useCallback(
    async (songId: string): Promise<SongMeta | null> => {
      if (!workspaceId || !uid) {
        return null;
      }

      try {
        const copyMeta = await duplicateCloudSong(workspaceId, songId, uid);
        setSongs((current) => sortSongMetas([copyMeta, ...current]));
        return copyMeta;
      } catch (duplicateError) {
        console.error("Could not duplicate song", duplicateError);
        throw duplicateError;
      }
    },
    [workspaceId, uid],
  );

  const deleteSong = useCallback(
    async (songId: string): Promise<boolean> => {
      if (!workspaceId) {
        return false;
      }

      let previous: SongMeta[] = [];

      setSongs((current) => {
        previous = current;
        return current.filter((item) => item.id !== songId);
      });

      try {
        await deleteCloudSong(workspaceId, songId);
        return true;
      } catch (deleteError) {
        console.error("Could not delete song", deleteError);
        // Roll back optimistic removal.
        setSongs(previous);
        throw deleteError;
      }
    },
    [workspaceId],
  );

  const value = useMemo<SongsProviderState>(
    () => ({
      songs,
      recentSongs: songs.slice(0, 6),
      isLoading,
      error,
      reload,
      createSong,
      duplicateSong,
      deleteSong,
    }),
    [songs, isLoading, error, reload, createSong, duplicateSong, deleteSong],
  );

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useWorkspaceSongs(): SongsProviderState {
  const context = useContext(SongsContext);

  if (!context) {
    throw new Error("useWorkspaceSongs must be used inside <WorkspaceSongsProvider>.");
  }

  return context;
}
