"use client";

import type { Song } from "@/lib/songTypes";

type MetadataPanelProps = {
  song: Song;
  onChange: (patch: Partial<Song>) => void;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

export function MetadataPanel({ song, onChange }: MetadataPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Song Details
      </h2>
      <div className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Song title
          <input
            value={song.title}
            onBlur={(event) => {
              if (!event.target.value.trim()) {
                onChange({ title: "Untitled Song" });
              }
            }}
            onChange={(event) => onChange({ title: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Artist
          <input
            value={song.artist ?? ""}
            onChange={(event) => onChange({ artist: event.target.value })}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Key
            <input
              value={song.key ?? ""}
              onChange={(event) => onChange({ key: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tempo
            <input
              value={song.tempo ?? ""}
              onChange={(event) => onChange({ tempo: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Director notes
          <textarea
            value={song.notes ?? ""}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>
    </section>
  );
}
