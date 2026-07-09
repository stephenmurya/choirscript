import { Fragment } from "react";
import {
  arrangeTechniqueRangeRows,
  flattenLineSyllables,
  getAnnotationsForSyllable,
  getPrimaryAnnotation,
  groupTechniqueDisplayRanges,
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
    <span className="inline-flex h-9 w-10 min-w-10 items-center justify-center rounded-md border border-border bg-muted/40 px-1.5 py-2 text-center text-[0.82rem] font-medium text-foreground sm:h-8 sm:w-10 sm:min-w-10 sm:py-1.5 sm:text-[0.78rem]">
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
    soprano: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    alto: "border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    tenor: "border-amber-400/40 bg-amber-500/10 text-amber-200 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
    bass: "border-border bg-card text-muted-foreground shadow-[8px_0_12px_-10px_rgba(0,0,0,0.65)]",
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
    <div className="mt-4 flex flex-col gap-1 rounded-md bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
      {notes.map((item) => (
        <p key={item.id}>
          <span className="font-semibold text-foreground">{item.label}:</span> {item.note}
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
  const placedTechniqueRanges = toggles.techniques
    ? arrangeTechniqueRangeRows(groupTechniqueDisplayRanges(line))
    : [];
  const annotationRowCount = placedTechniqueRanges.reduce(
    (maxRow, range) => Math.max(maxRow, range.row + 1),
    0,
  );
  const lyricGridRow = annotationRowCount + 1;
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
        <div className="line-grid-shell grid w-max min-w-0 items-end gap-x-1.5 gap-y-0.5 pr-3" style={gridStyle}>
          {placedTechniqueRanges.map((range) => {
            const technique = getTechniqueById(range.techniqueId);

            if (!technique) {
              return null;
            }

            return (
              <span
                key={range.id}
                className="-mb-px flex w-fit max-w-full justify-self-start"
                style={{
                  gridColumn: `${range.startIndex + 2} / span ${
                    range.endIndex - range.startIndex + 1
                  }`,
                  gridRow: range.row + 1,
                }}
              >
                <TechniqueBadge
                  technique={technique}
                  compact
                  className="technique-range-label rounded-t-[6px] rounded-b-none px-2 py-1 text-[0.72rem] shadow-sm"
                />
              </span>
            );
          })}
          <div
            className="sticky left-0 z-20 bg-card"
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
                className={`min-h-8 w-max min-w-[var(--syllable-col-min,2.75rem)] justify-self-center whitespace-nowrap rounded-[6px] border p-2 text-center text-[0.96rem] font-medium leading-none text-foreground ${
                  technique
                    ? `${technique.highlightClass} ${technique.borderClass} shadow-sm`
                    : "border-transparent"
                } ${annotations.length > 1 ? "ring-1 ring-current/30" : ""}`}
              >
                {flat.text}
                {!isWordEnd ? <span className="pl-0.5 text-muted-foreground">-</span> : null}
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
        <h1 className="rehearsal-title text-foreground">
          {song.title || "Untitled Song"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[song.artist ? `Singer: ${song.artist}` : null, song.key ? `Key: ${song.key}` : null, song.tempo ? `BPM: ${song.tempo}` : null]
            .filter(Boolean)
            .join(", ")}
        </p>
        {toggles.directorNotes && song.notes ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
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
          <section key={section.id} className="rehearsal-section border-b border-border pb-8 last:border-b-0">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              {section.name}
            </h2>
            {section.lines.length === 0 ? (
              <p className="text-muted-foreground">
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
