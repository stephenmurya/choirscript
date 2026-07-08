"use client";

import { useState } from "react";
import { getLineSyllableIds, getWordSyllableIds } from "@/lib/songSelection";
import { splitManualSyllables } from "@/lib/syllableSplitter";
import type { SongSection, WordToken } from "@/lib/songTypes";
import { SyllableCell } from "./SyllableCell";

type SyllableGridProps = {
  sections: SongSection[];
  includeBass: boolean;
  selectedIds: string[];
  onSelectSyllable: (syllableId: string, additive: boolean) => void;
  onSelectMany: (syllableIds: string[], additive: boolean) => void;
  onUpdateWordSyllables: (
    sectionId: string,
    lineId: string,
    wordId: string,
    syllables: string[],
  ) => void;
};

type EditingWord = {
  sectionId: string;
  lineId: string;
  word: WordToken;
};

function partRows(includeBass: boolean) {
  const rows = [
    { key: "soprano" as const, label: "Soprano" },
    { key: "alto" as const, label: "Alto" },
    { key: "tenor" as const, label: "Tenor" },
  ];

  return includeBass ? [...rows, { key: "bass" as const, label: "Bass" }] : rows;
}

export function SyllableGrid({
  sections,
  includeBass,
  selectedIds,
  onSelectSyllable,
  onSelectMany,
  onUpdateWordSyllables,
}: SyllableGridProps) {
  const [editingWord, setEditingWord] = useState<EditingWord | null>(null);
  const [manualValue, setManualValue] = useState("");
  const selectedSet = new Set(selectedIds);

  return (
    <div className="space-y-6">
      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Add a section or paste lyrics to start building a script.
        </div>
      ) : null}
      {sections.map((section) => (
        <section key={section.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Section
              </p>
              <h2 className="text-xl font-semibold text-slate-950">{section.name}</h2>
            </div>
          </div>
          {section.lines.length === 0 ? (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
              This section has no lyric lines yet.
            </p>
          ) : null}
          <div className="space-y-5">
            {section.lines.map((line, lineIndex) => {
              const syllables = line.words.flatMap((word) =>
                word.syllables.map((syllable) => ({ syllable, word })),
              );
              const gridStyle = {
                gridTemplateColumns: `repeat(${Math.max(syllables.length, 1)}, minmax(5rem, 1fr))`,
              };

              return (
                <div
                  key={line.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Line {lineIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => onSelectMany(getLineSyllableIds(line), event.shiftKey)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 hover:bg-cyan-50"
                    >
                      Select line
                    </button>
                  </div>
                  {syllables.length === 0 ? (
                    <p className="text-sm text-slate-500">No syllables in this line.</p>
                  ) : (
                    <div className="overflow-x-auto pb-1">
                      <div className="min-w-[44rem] space-y-2">
                        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                          <div className="py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Word
                          </div>
                          <div className="grid gap-1" style={gridStyle}>
                            {line.words.map((word) => (
                              <div
                                key={word.id}
                                style={{
                                  gridColumn: `span ${Math.max(word.syllables.length, 1)} / span ${Math.max(
                                    word.syllables.length,
                                    1,
                                  )}`,
                                }}
                                className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2"
                              >
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    onSelectMany(getWordSyllableIds(word), event.shiftKey)
                                  }
                                  className="truncate text-sm font-semibold text-slate-800 hover:text-cyan-700"
                                  title={`Select word: ${word.originalWord}`}
                                >
                                  {word.originalWord}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingWord({ sectionId: section.id, lineId: line.id, word });
                                    setManualValue(
                                      word.syllables.map((syllable) => syllable.text).join("-"),
                                    );
                                  }}
                                  className="shrink-0 rounded border border-slate-300 px-1.5 py-1 text-[0.68rem] font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700"
                                >
                                  Edit syllables
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                          <div className="py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Lyrics
                          </div>
                          <div className="grid gap-1" style={gridStyle}>
                            {syllables.map(({ syllable }) => (
                              <SyllableCell
                                key={syllable.id}
                                syllable={syllable}
                                selected={selectedSet.has(syllable.id)}
                                variant="lyric"
                                onSelect={onSelectSyllable}
                              />
                            ))}
                          </div>
                        </div>
                        {partRows(includeBass).map((part) => (
                          <div key={part.key} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                            <div className="py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {part.label}
                            </div>
                            <div className="grid gap-1" style={gridStyle}>
                              {syllables.map(({ syllable }) => (
                                <SyllableCell
                                  key={`${part.key}-${syllable.id}`}
                                  syllable={syllable}
                                  selected={selectedSet.has(syllable.id)}
                                  variant="part"
                                  value={syllable[part.key] ?? ""}
                                  onSelect={onSelectSyllable}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                          <div className="py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Technique
                          </div>
                          <div className="grid gap-1" style={gridStyle}>
                            {syllables.map(({ syllable }) => (
                              <SyllableCell
                                key={`technique-${syllable.id}`}
                                syllable={syllable}
                                selected={selectedSet.has(syllable.id)}
                                variant="technique"
                                onSelect={onSelectSyllable}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {editingWord?.sectionId === section.id && editingWord.lineId === line.id ? (
                    <form
                      className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const nextSyllables = splitManualSyllables(manualValue);

                        if (nextSyllables.length > 0) {
                          onUpdateWordSyllables(
                            editingWord.sectionId,
                            editingWord.lineId,
                            editingWord.word.id,
                            nextSyllables,
                          );
                          setEditingWord(null);
                          setManualValue("");
                        }
                      }}
                    >
                      <label className="block text-sm font-medium text-slate-700">
                        Edit syllables for {editingWord.word.originalWord}
                        <input
                          value={manualValue}
                          onChange={(event) => setManualValue(event.target.value)}
                          placeholder="A-maz-ing"
                          className="mt-1 w-full rounded-md border border-cyan-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        />
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="submit"
                          className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
                        >
                          Save syllables
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWord(null);
                            setManualValue("");
                          }}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
