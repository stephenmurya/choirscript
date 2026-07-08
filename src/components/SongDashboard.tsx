"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEmptySong,
  deleteSong,
  duplicateSong,
  loadSongs,
  saveSong,
} from "@/lib/songStorage";
import type { Song } from "@/lib/songTypes";
import { NewSongDialog } from "./NewSongDialog";
import { OnboardingDialog } from "./OnboardingDialog";

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SongDashboard() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSongs(loadSongs());
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function refreshSongs() {
    setSongs(loadSongs());
  }

  function handleCreateSong(metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>) {
    const song = {
      ...createEmptySong(),
      ...metadata,
    };
    saveSong(song);
    setIsNewSongOpen(false);
    router.push(`/songs/${song.id}`);
  }

  function handleDuplicate(song: Song) {
    const copy = duplicateSong(song);
    saveSong(copy);
    refreshSongs();
  }

  function handleDelete(song: Song) {
    if (window.confirm(`Delete "${song.title || "Untitled Song"}"?`)) {
      deleteSong(song.id);
      refreshSongs();
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-3 py-6 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              ChoirScript
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Annotated choir scripts for directors who teach by ear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsTipsOpen(true)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Show tips
            </button>
            <button
              type="button"
              onClick={() => setIsNewSongOpen(true)}
              className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              New Song
            </button>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Saved songs</h2>
            {loaded ? (
              <span className="text-sm text-slate-500">
                {songs.length} song{songs.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          {!loaded ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
              Loading songs...
            </div>
          ) : null}
          {loaded && songs.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No songs saved yet</h3>
              <p className="mt-2 text-sm text-slate-600">
                Create a new song or refresh to restore the demo seed if storage is empty.
              </p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {songs.map((song) => (
              <article
                key={song.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300"
              >
                <div className="min-h-24">
                  <h3 className="text-xl font-semibold text-slate-950">
                    {song.title || "Untitled Song"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Updated {formatUpdated(song.updatedAt)}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {[song.artist, song.key, song.tempo].filter(Boolean).join(" - ") ||
                      "No artist, key, or tempo yet"}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/songs/${song.id}`}
                    className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(song)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(song)}
                    className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <NewSongDialog
        open={isNewSongOpen}
        onClose={() => setIsNewSongOpen(false)}
        onCreate={handleCreateSong}
      />
      <OnboardingDialog open={isTipsOpen} onOpenChange={setIsTipsOpen} autoShow />
    </main>
  );
}
