"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LyricsImporterProps = {
  activeSectionName?: string;
  onGenerate: (lyrics: string) => void;
};

export function LyricsImporter({ activeSectionName, onGenerate }: LyricsImporterProps) {
  const [lyrics, setLyrics] = useState("");
  const [fileMessage, setFileMessage] = useState("");

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lyric Input
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pasted lines generate syllable tokens in {activeSectionName ?? "a default section"}.
          </p>
        </div>
      </div>
      <Textarea
        value={lyrics}
        onChange={(event) => setLyrics(event.target.value)}
        placeholder="Paste plain lyrics here..."
        rows={7}
        className="mt-4 resize-y"
      />
      <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
            className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
          />
        </label>
        {fileMessage ? <p className="mt-2 text-xs text-muted-foreground">{fileMessage}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-background px-2 py-1">
            Import .docx (TODO)
          </span>
          <span className="rounded-full border border-border bg-background px-2 py-1">
            Import .pdf (TODO)
          </span>
        </div>
        {/* TODO: Add DOCX/PDF parsing later with dedicated client-safe parsers. */}
      </div>
      <Button
        type="button"
        disabled={!lyrics.trim()}
        onClick={() => {
          onGenerate(lyrics);
          setLyrics("");
        }}
        className="mt-3 w-full"
      >
        Generate Script
      </Button>
    </section>
  );
}
