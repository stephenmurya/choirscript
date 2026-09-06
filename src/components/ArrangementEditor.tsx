"use client";

import { useMemo } from "react";
import { DndContext, PointerSensor, KeyboardSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, GripVertical, ListMusic, Minus, Plus, Trash2 } from "lucide-react";
import type { Song } from "@/lib/songTypes";
import { getActiveArrangement, normalizeRepeatCount } from "@/lib/arrangement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type ArrangementEditorProps = {
  song: Song;
  onAddOccurrence: (sourceSectionId: string) => void;
  onRemoveOccurrence: (occurrenceId: string) => void;
  onMoveOccurrence: (occurrenceId: string, direction: "up" | "down") => void;
  onReorderOccurrence: (occurrenceId: string, overOccurrenceId: string) => void;
  onSetOccurrenceNote: (occurrenceId: string, note: string) => void;
  onSetOccurrenceRepeatCount: (occurrenceId: string, repeatCount: number) => void;
  onEditSource: (sourceSectionId: string) => void;
};

function SortableRow({ song, occurrence, index, total, onRemoveOccurrence, onMoveOccurrence, onSetOccurrenceNote, onSetOccurrenceRepeatCount, onEditSource }: Omit<ArrangementEditorProps, "onAddOccurrence" | "onReorderOccurrence"> & { occurrence: NonNullable<ReturnType<typeof getActiveArrangement>>["occurrences"][number]; index: number; total: number }) {
  const section = song.source.sections.find((candidate) => candidate.id === occurrence.sourceSectionId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: occurrence.id });
  if (!section) return null;
  const repeatCount = normalizeRepeatCount(occurrence.repeatCount);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group rounded-xl border border-border bg-background/70 p-2.5 ${isDragging ? "z-10 opacity-70 shadow-lg" : ""}`}>
      <div className="flex items-start gap-2">
        <button type="button" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Drag ${section.name}`} {...attributes} {...listeners}><GripVertical className="size-4" /></button>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <button type="button" className="flex max-w-full items-center gap-1 text-left text-sm font-semibold text-foreground hover:text-primary" onClick={() => onEditSource(section.id)}><span className="truncate">{section.name}</span><ExternalLink className="size-3 shrink-0" /><span className="sr-only">Edit lyrics</span></button>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{section.lines.length} line{section.lines.length === 1 ? "" : "s"}</p>
          <Input aria-label={`Note for ${section.name} occurrence ${index + 1}`} value={occurrence.note ?? ""} onChange={(event) => onSetOccurrenceNote(occurrence.id, event.target.value)} placeholder="Performance note" className="mt-2 h-8 text-xs" />
        </div>
        <div className="flex shrink-0 items-center gap-0.5"><Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => onMoveOccurrence(occurrence.id, "up")} aria-label={`Move ${section.name} up`}><ArrowUp /></Button><Button type="button" variant="ghost" size="icon-xs" disabled={index === total - 1} onClick={() => onMoveOccurrence(occurrence.id, "down")} aria-label={`Move ${section.name} down`}><ArrowDown /></Button><Button type="button" variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => onRemoveOccurrence(occurrence.id)} aria-label={`Remove ${section.name} placement`}><Trash2 /></Button></div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/70 pt-2 text-xs text-muted-foreground"><span>Repeat</span><Button type="button" variant="outline" size="icon-xs" disabled={repeatCount <= 1} onClick={() => onSetOccurrenceRepeatCount(occurrence.id, repeatCount - 1)} aria-label="Decrease repeats"><Minus /></Button><span className="min-w-5 text-center font-semibold text-foreground">{repeatCount}</span><Button type="button" variant="outline" size="icon-xs" onClick={() => onSetOccurrenceRepeatCount(occurrence.id, repeatCount + 1)} aria-label="Increase repeats"><Plus /></Button></div>
    </li>
  );
}

function ArrangementPanelContent(props: ArrangementEditorProps) {
  const arrangement = getActiveArrangement(props.song);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = useMemo(() => arrangement?.occurrences.map((occurrence) => occurrence.id) ?? [], [arrangement]);
  function handleDragEnd(event: DragEndEvent) { if (event.over && event.active.id !== event.over.id) props.onReorderOccurrence(String(event.active.id), String(event.over.id)); }
  return (
    <div className="space-y-4">
      <div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><ListMusic className="size-4" /></span><div><h2 className="text-sm font-semibold text-foreground">Arrangement</h2><p className="text-xs text-muted-foreground">Performance order</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Rows reference canonical lyrics. Repeats stay compact here and expand only when rendered.</p></div>
      {props.song.source.sections.length === 0 ? <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Add a lyric section first.</p> : null}
      {arrangement && arrangement.occurrences.length > 0 ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={ids} strategy={verticalListSortingStrategy}><ol className="space-y-2" aria-label="Arrangement sequence">{arrangement.occurrences.map((occurrence, index) => <SortableRow key={occurrence.id} {...props} occurrence={occurrence} index={index} total={arrangement.occurrences.length} />)}</ol></SortableContext></DndContext> : <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No placements yet. Add one below.</p>}
      <div className="border-t border-border pt-3"><p className="text-xs font-semibold text-foreground">Add section</p><div className="mt-2 flex flex-wrap gap-1.5">{props.song.source.sections.map((section) => <Button key={section.id} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => props.onAddOccurrence(section.id)}><Plus />{section.name}</Button>)}</div></div>
    </div>
  );
}

export function ArrangementEditor(props: ArrangementEditorProps) {
  return <><div className="no-print order-3 mb-4 lg:hidden"><Sheet><SheetTrigger render={<Button type="button" variant="outline" className="w-full justify-between" />}><span className="flex items-center gap-2"><ListMusic className="size-4" />Arrangement roadmap</span><ChevronDown className="size-4" /></SheetTrigger><SheetContent side="right" className="w-[min(92vw,24rem)] overflow-y-auto p-5"><SheetHeader className="p-0 pb-5"><SheetTitle>Arrangement roadmap</SheetTitle><SheetDescription>Reorder placements and set repeats.</SheetDescription></SheetHeader><ArrangementPanelContent {...props} /></SheetContent></Sheet></div><aside className="no-print hidden min-w-0 lg:order-2 lg:block lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto"><ArrangementPanelContent {...props} /></aside></>;
}
