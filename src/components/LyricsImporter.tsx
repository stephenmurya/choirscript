"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LyricsImporterProps = {
  onReview: (lyrics: string) => void;
};

export function LyricsImporter({ onReview }: LyricsImporterProps) {
  const [lyrics, setLyrics] = useState("");
  const [fileMessage, setFileMessage] = useState("");

  return (
    <section className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Import lyrics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste or load plain lyrics. Section headings are detected automatically.
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
      <div className="mt-3 rounded-md border border-border/70 bg-background/60 p-3">
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
      </div>
      <Button
        type="button"
        disabled={!lyrics.trim()}
        onClick={() => {
          onReview(lyrics);
        }}
        className="mt-3 w-full"
      >
        Import lyrics
      </Button>
    </section>
  );
}
