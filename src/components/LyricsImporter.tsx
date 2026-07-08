"use client";

import { useState } from "react";

type LyricsImporterProps = {
  activeSectionName?: string;
  onGenerate: (lyrics: string) => void;
};

export function LyricsImporter({ activeSectionName, onGenerate }: LyricsImporterProps) {
  const [lyrics, setLyrics] = useState("");
  const [fileMessage, setFileMessage] = useState("");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Lyric Input
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pasted lines generate syllable tokens in {activeSectionName ?? "a default section"}.
          </p>
        </div>
      </div>
      <textarea
        value={lyrics}
        onChange={(event) => setLyrics(event.target.value)}
        placeholder="Paste plain lyrics here..."
        rows={7}
        className="mt-4 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Import .txt
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={async (event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              const text = await file.text();
              setLyrics(text);
              setFileMessage(`Loaded ${file.name}`);
              event.target.value = "";
            }}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>
        {fileMessage ? <p className="mt-2 text-xs text-slate-600">{fileMessage}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-300 bg-white px-2 py-1">
            Import .docx (TODO)
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-2 py-1">
            Import .pdf (TODO)
          </span>
        </div>
        {/* TODO: Add DOCX/PDF parsing later with dedicated client-safe parsers. */}
      </div>
      <button
        type="button"
        disabled={!lyrics.trim()}
        onClick={() => {
          onGenerate(lyrics);
          setLyrics("");
        }}
        className="mt-3 w-full rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Generate Script
      </button>
    </section>
  );
}
