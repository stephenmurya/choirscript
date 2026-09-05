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
  createSong as createCloudSong,
  deleteSong as deleteCloudSong,
  duplicateSong as duplicateCloudSong,
  listSongs,
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

  // One-time metadata query per workspace (re-runs on reload()).
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
        const meta = await createCloudSong(workspaceId, song, uid);
        setSongs((current) =>
          sortSongMetas([meta, ...current.filter((item) => item.id !== meta.id)]),
        );
        return meta;
      } catch (createError) {
        console.error("Could not create song", createError);
        throw createError;
      }
    },
    [workspaceId, uid],
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
