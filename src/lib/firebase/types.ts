import type { Song } from "@/lib/songTypes";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  defaultWorkspaceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  uid: string;
  role: WorkspaceRole;
  displayName?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lightweight dashboard metadata document. Deliberately excludes the song
 * document body (lyrics, syllables, timing, annotations) so listing songs
 * never downloads full editor documents.
 */
export type SongMeta = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: string;
  mode: Song["mode"];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  schemaVersion: 1;
};

export type SongDocument = {
  schemaVersion: 1;
  song: Song;
  updatedAt: string;
  updatedBy: string;
};

export function toSongMeta(song: Song, uid: string): SongMeta {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    key: song.key,
    tempo: song.tempo,
    mode: song.mode,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    createdBy: uid,
    updatedBy: uid,
    schemaVersion: 1,
  };
}

export function metaFromSong(song: Song, existing?: SongMeta | null, uid = ""): SongMeta {
  const base = toSongMeta(song, existing?.createdBy || uid);

  return {
    ...base,
    createdBy: existing?.createdBy || uid,
    updatedBy: uid || existing?.updatedBy || base.updatedBy,
  };
}
