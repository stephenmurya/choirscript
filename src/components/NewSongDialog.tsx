"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/songTypes";

type NewSongDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>) => void;
};

export function NewSongDialog({ open, onClose, onCreate }: NewSongDialogProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [tempo, setTempo] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const resetFields = useCallback(() => {
    setTitle("");
    setArtist("");
    setKeyValue("");
    setTempo("");
  }, []);

  const close = useCallback(() => {
    resetFields();
    onClose();
  }, [onClose, resetFields]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => titleRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  if (!open) {
    return null;
  }

  const canCreate = title.trim().length > 0;

  function submit() {
    if (!canCreate) {
      return;
    }

    onCreate({
      title: title.trim(),
      artist: artist.trim(),
      key: keyValue.trim(),
      tempo: tempo.trim(),
    });
    resetFields();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-song-title"
        className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:p-6"
      >
        <h2 id="new-song-title" className="text-xl font-semibold text-slate-950">
          Create new song
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Add the basic context now so the rehearsal document starts with a clear title.
        </p>
        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Song title
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCreate) {
                  event.preventDefault();
                  submit();
                }
              }}
              aria-invalid={!canCreate}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          {!canCreate ? (
            <p className="-mt-2 text-xs font-medium text-slate-500">Song title is required.</p>
          ) : null}
          <label className="block text-sm font-medium text-slate-700">
            Artist/Singer optional
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Key optional
              <input
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              BPM optional
              <input
                value={tempo}
                onChange={(event) => setTempo(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canCreate}
            className="min-h-11 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Create Song
          </button>
        </div>
      </section>
    </div>
  );
}
