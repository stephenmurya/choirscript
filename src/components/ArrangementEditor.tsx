"use client";

import { ArrowDown, ArrowUp, ExternalLink, ListMusic, Trash2 } from "lucide-react";
import type { Song } from "@/lib/songTypes";
import { getActiveArrangement } from "@/lib/arrangement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ArrangementEditorProps = {
  song: Song;
  onAddOccurrence: (sourceSectionId: string) => void;
  onRemoveOccurrence: (occurrenceId: string) => void;
  onMoveOccurrence: (occurrenceId: string, direction: "up" | "down") => void;
  onSetOccurrenceNote: (occurrenceId: string, note: string) => void;
  onEditSource: (sourceSectionId: string) => void;
};

export function ArrangementEditor({
  song,
  onAddOccurrence,
  onRemoveOccurrence,
  onMoveOccurrence,
  onSetOccurrenceNote,
  onEditSource,
}: ArrangementEditorProps) {
  const arrangement = getActiveArrangement(song);

  return (
    <section className="mx-auto w-full max-w-[900px] px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ListMusic className="size-5" />
            </span>
            <div>
              <CardTitle>Arrangement</CardTitle>
              <CardDescription className="mt-1">
                Arrange the performance order. Each placement points to canonical Source content.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {song.source.sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Create a Source section first, then add it to the arrangement.
            </div>
          ) : null}

          {arrangement && arrangement.occurrences.length > 0 ? (
            <ol className="space-y-3" aria-label="Arrangement sequence">
              {arrangement.occurrences.map((occurrence, index) => {
                const section = song.source.sections.find(
                  (candidate) => candidate.id === occurrence.sourceSectionId,
                );

                if (!section) {
                  return null;
                }

                return (
                  <li
                    key={occurrence.id}
                    className="rounded-2xl border border-border bg-background/70 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="flex max-w-full items-center gap-1 text-left text-base font-semibold text-foreground hover:text-primary"
                            onClick={() => onEditSource(section.id)}
                          >
                            <span className="truncate">{section.name}</span>
                            <ExternalLink className="size-3.5 shrink-0" />
                            <span className="sr-only">Edit Source</span>
                          </button>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Canonical Source section · {section.lines.length} line
                            {section.lines.length === 1 ? "" : "s"}
                          </p>
                          <Input
                            aria-label={`Note for ${section.name} occurrence ${index + 1}`}
                            value={occurrence.note ?? ""}
                            onChange={(event) =>
                              onSetOccurrenceNote(occurrence.id, event.target.value)
                            }
                            placeholder="Optional performance note"
                            className="mt-3 max-w-xl"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-start">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => onMoveOccurrence(occurrence.id, "up")}
                          aria-label={`Move ${section.name} up`}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          disabled={index === arrangement.occurrences.length - 1}
                          onClick={() => onMoveOccurrence(occurrence.id, "down")}
                          aria-label={`Move ${section.name} down`}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onRemoveOccurrence(occurrence.id)}
                          aria-label={`Remove ${section.name} occurrence`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              This arrangement has no placements yet. Add a Source section below.
            </div>
          )}

          <div className="border-t border-border pt-5">
            <h2 className="text-sm font-semibold text-foreground">Add a placement</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adding a section here reuses its Source content; it does not create a copy.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {song.source.sections.map((section) => (
                <Button
                  key={section.id}
                  type="button"
                  variant="outline"
                  onClick={() => onAddOccurrence(section.id)}
                >
                  + {section.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
