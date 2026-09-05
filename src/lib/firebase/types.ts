import type { Song } from "@/lib/songTypes";
import { buildSongCardSummary } from "@/lib/songSummary";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Project-module vocabulary for card summaries. Presence-based: a key is
 * listed only when that module currently contains content in the project.
 * Future modules (arrangement, band, production) extend this list via their
 * save-path derivations — see src/lib/songSummary.ts.
 */
export type SongModuleKey =
  | "lyrics"
  | "vocalParts"
  | "arrangement"
  | "band"
  | "production";

export type SongContributorPreview = {
  uid: string;
  displayName: string;
  photoURL?: string;
};

/**
 * Lightweight summary living on the song METADATA document, built so
 * workspace cards render without document/current.
 *
 * - modules: presence-based (see deriveSongModulePresence)
 * - contributors: denormalized for cheap card rendering; preview shows at
 *   most 3 avatars, total may exceed it. Collaboration-ready without any
 *   collaboration logic existing yet.
 */
export type SongCardSummary = {
  version: 1;
  modules: SongModuleKey[];
  contributors: {
    total: number;
    preview: SongContributorPreview[];
  };
};

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
  cardSummary?: SongCardSummary;
};

export type SongDocument = {
  schemaVersion: 1;
  song: Song;
  updatedAt: string;
  updatedBy: string;
};

export type ContributorInfo = {
  uid: string;
  displayName: string;
  photoURL?: string;
};

export function toSongMeta(
  song: Song,
  uid: string,
  contributor?: ContributorInfo,
): SongMeta {
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
    cardSummary: buildSongCardSummary(
      song,
      contributor ?? { uid, displayName: "", photoURL: undefined },
    ),
  };
}

export function metaFromSong(
  song: Song,
  existing?: SongMeta | null,
  uid = "",
  contributor?: ContributorInfo,
): SongMeta {
  const previousContributor = existing?.cardSummary?.contributors.preview[0];
  const resolvedContributor: ContributorInfo =
    contributor ??
    ({
      uid: uid || previousContributor?.uid || "",
      displayName: previousContributor?.displayName ?? "",
      photoURL: previousContributor?.photoURL,
    } satisfies ContributorInfo);

  const base = toSongMeta(song, existing?.createdBy || uid, resolvedContributor);

  return {
    ...base,
    createdBy: existing?.createdBy || uid,
    updatedBy: uid || existing?.updatedBy || base.updatedBy,
  };
}
