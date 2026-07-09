"use client";

import { useState } from "react";
import type { TimingScope, VocalPart } from "@/lib/songTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TimingScopeSelectorProps = {
  scope: TimingScope;
  hasOverride: (part: VocalPart) => boolean;
  onScopeChange: (scope: TimingScope) => void;
  onCreateOverride: (part: VocalPart) => void;
  onResetOverride: (part: VocalPart) => void;
};

const parts: Array<{ value: TimingScope; label: string; description: string }> = [
  { value: "shared", label: "All Parts", description: "Shared timing" },
  { value: "soprano", label: "S", description: "Soprano override" },
  { value: "alto", label: "A", description: "Alto override" },
  { value: "tenor", label: "T", description: "Tenor override" },
  { value: "bass", label: "B", description: "Bass override" },
];

function partName(part: VocalPart) {
  return part[0].toUpperCase() + part.slice(1);
}

export function TimingScopeSelector({
  scope,
  hasOverride,
  onScopeChange,
  onCreateOverride,
  onResetOverride,
}: TimingScopeSelectorProps) {
  const [pendingPart, setPendingPart] = useState<VocalPart | null>(null);

  function handleScopeClick(nextScope: TimingScope) {
    if (nextScope === "shared") {
      onScopeChange(nextScope);
      return;
    }

    if (hasOverride(nextScope)) {
      onScopeChange(nextScope);
      return;
    }

    setPendingPart(nextScope);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Timing applies to
        </span>
        {parts.map((part) => (
          <Button
            key={part.value}
            type="button"
            size="sm"
            variant={scope === part.value ? "default" : "outline"}
            title={part.description}
            onClick={() => handleScopeClick(part.value)}
          >
            {part.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {scope === "shared" ? "Shared timing" : `${partName(scope)} override`}
        </Badge>
        {scope !== "shared" && hasOverride(scope) ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => {
              onResetOverride(scope);
              onScopeChange("shared");
            }}
          >
            Reset to shared timing
          </Button>
        ) : null}
      </div>

      <Dialog open={Boolean(pendingPart)} onOpenChange={(open) => !open && setPendingPart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create timing override for {pendingPart ? partName(pendingPart) : "part"}?
            </DialogTitle>
            <DialogDescription>
              This lets that part use different rests, holds, breaks, or syllable lengths from the
              shared timing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingPart(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!pendingPart) {
                  return;
                }
                onCreateOverride(pendingPart);
                onScopeChange(pendingPart);
                setPendingPart(null);
              }}
            >
              Create Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
