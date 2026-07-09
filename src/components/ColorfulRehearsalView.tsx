import { Fragment } from "react";
import {
  flattenLineSyllables,
  getAnnotationsForSyllable,
  getPrimaryAnnotation,
  groupTechniqueRanges,
  PART_LABELS,
} from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type { PartKey, Song, SongLine, SyllableToken } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";
import { TechniqueLegend } from "./TechniqueLegend";

export type RehearsalDisplayToggles = {
  soprano: boolean;
  alto: boolean;
  tenor: boolean;
  bass: boolean;
  techniques: boolean;
  directorNotes: boolean;
  largeText: boolean;
  blackAndWhite: boolean;
};

function VoiceLaneValue({
  syllable,
  part,
}: {
  syllable: SyllableToken;
  part: PartKey;
}) {
  const value = syllable[part] ?? "";

  return (
    <span className="inline-flex h-9 w-11 min-w-11 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-1.5 py-2 text-center text-[0.82rem] font-medium text-slate-800 sm:h-8 sm:w-10 sm:min-w-10 sm:py-1.5 sm:text-[0.78rem]">
      {value.trim() || "\u00a0"}
    </span>
  );
}

function ReadOnlyVoiceLanes({
  line,
  toggles,
  gridStartRow,
}: {
  line: SongLine;
  toggles: RehearsalDisplayToggles;
  gridStartRow: number;
}) {
  const syllables = flattenLineSyllables(line);
  const rows = PART_LABELS.filter((part) => {
    if (part.key === "bass") {
      return toggles.bass;
    }

    return toggles[part.key];
  });
  const labelClass: Record<PartKey, string> = {
    soprano: "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    alto: "border-violet-300 bg-violet-50 text-violet-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    tenor: "border-amber-300 bg-amber-50 text-amber-800 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
    bass: "border-slate-300 bg-slate-50 text-slate-700 shadow-[8px_0_12px_-10px_rgba(15,23,42,0.45)]",
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      {rows.map((row, rowIndex) => {
        const gridRow = gridStartRow + rowIndex;

        return (
        <Fragment key={row.key}>
          <div
            className={`sticky left-0 z-30 grid h-9 w-9 place-items-center rounded-md border text-xs font-semibold sm:h-8 sm:w-8 ${
              labelClass[row.key]
            }`}
            style={{ gridColumn: 1, gridRow }}
          >
            {row.label[0]}
          </div>
          {syllables.map((flat) => (
            <span
              key={`${row.key}-${flat.id}`}
              className="grid justify-items-center"
              style={{ gridColumn: flat.absoluteIndex + 2, gridRow }}
            >
              <VoiceLaneValue
                syllable={flat.word.syllables[flat.syllableIndex]}
                part={row.key}
              />
            </span>
          ))}
        </Fragment>
        );
      })}
    </>
  );
}

function DirectorNotes({ line }: { line: SongLine }) {
  const notes = line.words.flatMap((word) =>
    word.syllables
      .filter((syllable) => syllable.directorNote?.trim())
      .map((syllable) => ({
        id: syllable.id,
        label: `${word.originalWord} / ${syllable.text}`,
        note: syllable.directorNote,
      })),
  );

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-1 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
      {notes.map((item) => (
        <p key={item.id}>
          <span className="font-semibold text-slate-950">{item.label}:</span> {item.note}
        </p>
      ))}
    </div>
  );
}

function RehearsalLine({
  line,
  toggles,
}: {
  line: SongLine;
  toggles: RehearsalDisplayToggles;
}) {
  const flatSyllables = flattenLineSyllables(line);
  const techniqueRanges = toggles.techniques ? groupTechniqueRanges(line) : [];
  const lyricGridRow = techniqueRanges.length + 1;
  const voiceStartRow = lyricGridRow + 1;
  const gridStyle = {
    gridTemplateColumns: `var(--line-label-col, 2.75rem) repeat(${Math.max(
      flatSyllables.length,
      1,
    )}, minmax(var(--syllable-col-min, 2.75rem), max-content))`,
  };

  return (
    <div data-line-block="true" className="rehearsal-line line-block w-full overflow-hidden py-5">
      <div
        data-line-scroll="true"
        className="line-scroll max-w-full overflow-x-auto overscroll-x-contain pb-2"
      >
        <div className="line-grid-shell grid w-max min-w-0 items-end gap-x-1.5 gap-y-1 pr-3" style={gridStyle}>
          {techniqueRanges.map((range, rangeIndex) => {
            const technique = getTechniqueById(range.techniqueId);

            if (!technique) {
              return null;
            }

            return (
              <span
                key={range.id}
                className="mb-0.5 flex w-fit max-w-full"
                style={{
                  gridColumn: `${range.startIndex + 2} / span ${
                    range.endIndex - range.startIndex + 1
                  }`,
                  gridRow: rangeIndex + 1,
                }}
              >
                <TechniqueBadge technique={technique} compact />
              </span>
            );
          })}
          <div
            className="sticky left-0 z-20 bg-slate-50"
            style={{ gridColumn: 1, gridRow: lyricGridRow }}
          />
          {flatSyllables.map((flat) => {
            const annotations = toggles.techniques ? getAnnotationsForSyllable(line, flat.id) : [];
            const primaryAnnotation = toggles.techniques
              ? getPrimaryAnnotation(line, flat.id)
              : undefined;
            const technique = primaryAnnotation
              ? getTechniqueById(primaryAnnotation.techniqueId)
              : undefined;
            const isWordEnd = flat.syllableIndex === flat.word.syllables.length - 1;

            return (
              <span
                key={flat.id}
                style={{ gridColumn: flat.absoluteIndex + 2, gridRow: lyricGridRow }}
                className={`w-max min-w-[var(--syllable-col-min,2.75rem)] justify-self-center whitespace-nowrap rounded px-1 text-center text-[0.96rem] font-medium leading-8 text-slate-700 sm:leading-7 ${
                  technique ? technique.highlightClass : ""
                } ${annotations.length > 1 ? "border-b-2 border-current" : ""}`}
              >
                {flat.text}
                {!isWordEnd ? <span className="pl-0.5 text-slate-400">-</span> : null}
              </span>
            );
          })}
          <ReadOnlyVoiceLanes line={line} toggles={toggles} gridStartRow={voiceStartRow} />
        </div>
      </div>
      {toggles.directorNotes ? <DirectorNotes line={line} /> : null}
    </div>
  );
}

export function ColorfulRehearsalView({
  song,
  toggles,
}: {
  song: Song;
  toggles: RehearsalDisplayToggles;
}) {
  return (
    <article
      className={`rehearsal-document mx-auto w-full max-w-[900px] px-3 pb-12 pt-6 sm:px-5 sm:pt-8 ${
        toggles.largeText ? "large-text" : ""
      } ${toggles.blackAndWhite ? "print-black-white" : ""}`}
    >
      <header className="pb-8">
        <h1 className="rehearsal-title text-slate-800">
          {song.title || "Untitled Song"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {[song.artist ? `Singer: ${song.artist}` : null, song.key ? `Key: ${song.key}` : null, song.tempo ? `BPM: ${song.tempo}` : null]
            .filter(Boolean)
            .join(", ")}
        </p>
        {toggles.directorNotes && song.notes ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {song.notes}
          </p>
        ) : null}
      </header>

      {toggles.techniques ? (
        <div className="mb-8">
          <TechniqueLegend />
        </div>
      ) : null}

      <div className="space-y-8">
        {song.sections.map((section) => (
          <section key={section.id} className="rehearsal-section border-b border-slate-200 pb-8 last:border-b-0">
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              {section.name}
            </h2>
            {section.lines.length === 0 ? (
              <p className="text-slate-500">
                No lyric lines in this section.
              </p>
            ) : null}
            {section.lines.map((line) => (
              <RehearsalLine key={line.id} line={line} toggles={toggles} />
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
