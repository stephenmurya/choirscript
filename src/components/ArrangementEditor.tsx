"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  GripVertical,
  ListMusic,
  Minus,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ArrangementOccurrence, Song, VocalPart } from "@/lib/songTypes";
import { getActiveArrangement, normalizeRepeatCount } from "@/lib/arrangement";
import { PART_LABELS } from "@/lib/annotationUtils";
import { getEnabledVoiceParts } from "@/lib/songSelection";
import { getPerformerSuggestions, rememberPerformerLabel } from "@/lib/performerLabels";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const PERFORMER_LIST_ID = "arrangement-performer-suggestions";

type ArrangementEditorProps = {
  song: Song;
  onAddOccurrence: (sourceSectionId: string) => void;
  onRemoveOccurrence: (occurrenceId: string) => void;
  onMoveOccurrence: (occurrenceId: string, direction: "up" | "down") => void;
  onReorderOccurrence: (occurrenceId: string, overOccurrenceId: string) => void;
  onSetOccurrenceNote: (occurrenceId: string, note: string) => void;
  onSetOccurrencePerformer: (occurrenceId: string, performer: string) => void;
  onSetOccurrenceVoicing: (
    occurrenceId: string,
    voicing: "harmony" | "melody",
    melodyPart?: VocalPart,
  ) => void;
  onDuplicateOccurrence: (occurrenceId: string) => void;
  onDuplicateSection: (sourceSectionId: string) => void;
  onSetOccurrenceRepeatCount: (occurrenceId: string, repeatCount: number) => void;
  onEditSource: (sourceSectionId: string) => void;
  resizeHandle?: ReactNode;
};

function SectionPicker({
  song,
  onAddOccurrence,
  onDuplicateSection,
}: Pick<ArrangementEditorProps, "song" | "onAddOccurrence" | "onDuplicateSection">) {
  return (
    <div className="mt-3">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Sections
      </p>
      <ul className="mt-1.5 space-y-0.5" aria-label="Sections available to place">
        {song.source.sections.map((section, sectionIndex) => {
          const duplicateIndex = song.source.sections
            .slice(0, sectionIndex)
            .filter(
              (candidate) =>
                candidate.name.trim().toLowerCase() === section.name.trim().toLowerCase(),
            ).length;
          const duplicateCount = song.source.sections.filter(
            (candidate) => candidate.name.trim().toLowerCase() === section.name.trim().toLowerCase(),
          ).length;
          const label =
            duplicateCount > 1 ? `${section.name} ${String.fromCharCode(65 + duplicateIndex)}` : section.name;
          const preview = section.lines[0]?.words.map((word) => word.originalWord).join(" ");

          return (
            <li
              key={section.id}
              className="group/section flex items-center gap-1 rounded-lg px-1 transition hover:bg-muted/60"
            >
              <button
                type="button"
                onClick={() => onAddOccurrence(section.id)}
                title={preview ? `Add ${label} — ${preview}` : `Add ${label}`}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground transition group-hover/section:text-primary" />
                <span className="truncate text-xs font-medium text-foreground">{label}</span>
                <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {section.lines.length}L
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDuplicateSection(section.id)}
                aria-label={`Duplicate section ${label}`}
                title="Duplicate section"
                className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus:opacity-100 group-hover/section:opacity-100"
              >
                <Copy className="size-3" />
              </button>
            </li>
          );
        })}
      </ul>
      {song.source.sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-2 py-3 text-[11px] text-muted-foreground">
          Add a lyric section first.
        </p>
      ) : null}
    </div>
  );
}

function SortableRow({
  song,
  occurrence,
  index,
  total,
  onRemoveOccurrence,
  onMoveOccurrence,
  onSetOccurrenceNote,
  onSetOccurrencePerformer,
  onSetOccurrenceVoicing,
  onDuplicateOccurrence,
  onSetOccurrenceRepeatCount,
  onEditSource,
}: Omit<ArrangementEditorProps, "onAddOccurrence" | "onReorderOccurrence" | "onDuplicateSection"> & {
  occurrence: ArrangementOccurrence;
  index: number;
  total: number;
}) {
  const section = song.source.sections.find((candidate) => candidate.id === occurrence.sourceSectionId);
  const enabledParts = getEnabledVoiceParts(song);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: occurrence.id,
  });
  const [isEditing, setIsEditing] = useState(false);

  if (!section) {
    return null;
  }

  const repeatCount = normalizeRepeatCount(occurrence.repeatCount);
  const dragTransform = transform ? CSS.Transform.toString(transform) : undefined;

  return (
    <li
      ref={setNodeRef}
      style={{
        // dnd-kit owns the translate; the tilt is appended so the dragged
        // placement reads as "lifted" instead of just shifting.
        transform: isDragging && dragTransform ? `${dragTransform} rotate(2.5deg) scale(1.02)` : dragTransform,
        transition,
      }}
      className={`group rounded-xl border p-2 transition ${
        isDragging
          ? "z-50 cursor-grabbing border-primary/50 bg-popover shadow-2xl ring-2 ring-primary/20"
          : "border-border bg-card/40 hover:border-border hover:bg-card"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="-ml-1 grid size-5 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag ${section.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditSource(section.id)}
              className="min-w-0 truncate text-left text-xs font-semibold leading-5 text-foreground transition hover:text-primary"
              title={`Edit ${section.name}`}
            >
              {section.name}
            </button>
            {repeatCount > 1 ? (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                ×{repeatCount}
              </span>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-1.5 space-y-1">
              <label className="flex min-w-0 items-center gap-1">
                <UserRound className="size-3 shrink-0 text-muted-foreground" />
                <input
                  aria-label={`Who sings ${section.name} placement ${index + 1}`}
                  list={PERFORMER_LIST_ID}
                  value={occurrence.performer ?? ""}
                  onChange={(event) => onSetOccurrencePerformer(occurrence.id, event.target.value)}
                  onBlur={(event) => {
                    if (event.target.value.trim()) {
                      rememberPerformerLabel(event.target.value);
                    }
                  }}
                  placeholder="Who sings this? Lead, Backups…"
                  className="h-7 w-full min-w-0 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
                />
              </label>
              <input
                aria-label={`Note for ${section.name} placement ${index + 1}`}
                value={occurrence.note ?? ""}
                onChange={(event) => onSetOccurrenceNote(occurrence.id, event.target.value)}
                placeholder="Note (optional)"
                className="h-7 w-full min-w-0 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
              />
              {/* Unison vs harmony: "melody" means the whole section sings the
                  one line carried by melodyPart, so rehearsal shows a single lane. */}
              <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => onSetOccurrenceVoicing(occurrence.id, "harmony", occurrence.melodyPart)}
                  aria-pressed={occurrence.voicing !== "melody"}
                  className={`flex-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition ${
                    occurrence.voicing !== "melody"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  SATB
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetOccurrenceVoicing(occurrence.id, "melody", occurrence.melodyPart ?? "soprano")
                  }
                  aria-pressed={occurrence.voicing === "melody"}
                  className={`flex-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition ${
                    occurrence.voicing === "melody"
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Melody
                </button>
              </div>
              {occurrence.voicing === "melody" ? (
                <div className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] text-muted-foreground">Melody line</span>
                  <div className="flex min-w-0 flex-1 items-center gap-0.5">
                    {PART_LABELS.filter((part) => enabledParts.includes(part.key)).map((part) => {
                      const active = (occurrence.melodyPart ?? "soprano") === part.key;

                      return (
                        <button
                          key={part.key}
                          type="button"
                          onClick={() => onSetOccurrenceVoicing(occurrence.id, "melody", part.key)}
                          aria-pressed={active}
                          title={`Melody on ${part.label}`}
                          className={`grid h-[22px] flex-1 place-items-center rounded border text-[10px] font-semibold transition ${
                            active
                              ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {part.label.slice(0, 1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-0.5 flex max-w-full items-center gap-1 text-left text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              {occurrence.performer ? (
                <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  <UserRound className="size-2.5 shrink-0" />
                  <span className="truncate">{occurrence.performer}</span>
                </span>
              ) : (
                <span className="min-w-0 truncate italic">Who sings this?</span>
              )}
              {occurrence.voicing === "melody" ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-300">
                  Melody · {(occurrence.melodyPart ?? "soprano").slice(0, 1).toUpperCase()}
                </span>
              ) : null}
            </button>
          )}
        </div>

      </div>

      {/* Controls live on their own row: squeezing repeat and four actions
          beside the performer/note fields left no room for the text itself in a
          22rem panel. */}
      <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-border/60 pt-1.5">
        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <span className="mr-0.5">Repeat</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={repeatCount <= 1}
            onClick={() => onSetOccurrenceRepeatCount(occurrence.id, repeatCount - 1)}
            aria-label="Decrease repeats"
          >
            <Minus />
          </Button>
          <span className="min-w-3 text-center text-[11px] font-semibold tabular-nums text-foreground">
            {repeatCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onSetOccurrenceRepeatCount(occurrence.id, repeatCount + 1)}
            aria-label="Increase repeats"
          >
            <Plus />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 text-muted-foreground opacity-70 transition group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={index === 0}
            onClick={() => onMoveOccurrence(occurrence.id, "up")}
            aria-label={`Move ${section.name} up`}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={index === total - 1}
            onClick={() => onMoveOccurrence(occurrence.id, "down")}
            aria-label={`Move ${section.name} down`}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onDuplicateOccurrence(occurrence.id)}
            aria-label={`Duplicate ${section.name} placement`}
            title="Duplicate placement"
          >
            <Copy />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={() => onRemoveOccurrence(occurrence.id)}
            aria-label={`Remove ${section.name} placement`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

function ArrangementPanelContent(props: ArrangementEditorProps) {
  const arrangement = getActiveArrangement(props.song);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(
    () => arrangement?.occurrences.map((occurrence) => occurrence.id) ?? [],
    [arrangement],
  );

  // Labels already used in this song come first, then anything remembered from
  // earlier sessions, so a name typed once is available everywhere afterwards.
  const suggestions = useMemo(() => {
    const labels = (arrangement?.occurrences ?? [])
      .map((occurrence) => occurrence.performer ?? "")
      .filter(Boolean);

    return getPerformerSuggestions(labels);
  }, [arrangement]);

  function handleDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) {
      props.onReorderOccurrence(String(event.active.id), String(event.over.id));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <datalist id={PERFORMER_LIST_ID}>
        {suggestions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      <div className="relative z-20 shrink-0 bg-background pb-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <ListMusic className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Arrangement</h2>
            <p className="text-xs text-muted-foreground">Performance order</p>
          </div>
        </div>
        <SectionPicker
          song={props.song}
          onAddOccurrence={props.onAddOccurrence}
          onDuplicateSection={props.onDuplicateSection}
        />
        {/* Fade so the placements scrolling underneath do not collide with the
            section list above. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-6 h-6 bg-gradient-to-b from-background to-transparent"
        />
      </div>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
        {arrangement && arrangement.occurrences.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol className="space-y-1.5 py-1.5" aria-label="Arrangement sequence">
                {arrangement.occurrences.map((occurrence, index) => (
                  <SortableRow
                    key={occurrence.id}
                    {...props}
                    occurrence={occurrence}
                    index={index}
                    total={arrangement.occurrences.length}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            No placements yet. Tap a section above to place it.
          </p>
        )}
      </div>
    </div>
  );
}

export function ArrangementEditor(props: ArrangementEditorProps) {
  return (
    <>
      <div className="no-print order-3 mb-4 xl:hidden">
        <Sheet>
          <SheetTrigger
            render={<Button type="button" variant="outline" className="w-full justify-between" />}
          >
            <span className="flex items-center gap-2">
              <ListMusic className="size-4" />
              Arrangement
            </span>
            <ChevronDown className="size-4" />
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[min(92vw,24rem)] flex-col p-5">
            <SheetHeader className="p-0 pb-3">
              <SheetTitle>Arrangement</SheetTitle>
              <SheetDescription>Place sections, set who sings them, reorder.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1">
              <ArrangementPanelContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="panel-scroll no-print relative hidden min-w-0 xl:sticky xl:top-16 xl:order-3 xl:flex xl:h-[calc(100svh-4rem)] xl:flex-col xl:border-l xl:border-border/60 xl:px-3.5 xl:py-5">
        {props.resizeHandle}
        <ArrangementPanelContent {...props} />
      </aside>
    </>
  );
}
