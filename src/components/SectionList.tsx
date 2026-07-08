"use client";

import { useState } from "react";
import type { SongSection } from "@/lib/songTypes";

type SectionListProps = {
  sections: SongSection[];
  activeSectionId: string | null;
  onActivate: (sectionId: string) => void;
  onAddSection: () => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddLine: (sectionId: string, lyricLine: string) => void;
};

export function SectionList({
  sections,
  activeSectionId,
  onActivate,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onAddLine,
}: SectionListProps) {
  const [newLineBySection, setNewLineBySection] = useState<Record<string, string>>({});

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Structure
        </h2>
        <button
          type="button"
          onClick={onAddSection}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add section
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {sections.length === 0 ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            Add a section to begin building the script.
          </p>
        ) : null}
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          const newLine = newLineBySection[section.id] ?? "";

          return (
            <div
              key={section.id}
              className={`rounded-lg border p-3 ${
                isActive ? "border-cyan-400 bg-cyan-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => onActivate(section.id)}
                className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                {isActive ? "Active section" : "Use section"}
              </button>
              <label className="block text-sm font-medium text-slate-700">
                Section name
                <input
                  value={section.name}
                  onChange={(event) => onRenameSection(section.id, event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{section.lines.length} lyric lines</span>
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  className="font-semibold text-red-700 transition hover:text-red-800"
                >
                  Delete section
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <input
                  value={newLine}
                  placeholder="Add lyric line"
                  onChange={(event) =>
                    setNewLineBySection((current) => ({
                      ...current,
                      [section.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    onAddLine(section.id, newLine || "New lyric line");
                    setNewLineBySection((current) => ({ ...current, [section.id]: "" }));
                  }}
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Add lyric line
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
