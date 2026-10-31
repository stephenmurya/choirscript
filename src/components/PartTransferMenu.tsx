"use client";

import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { PART_LABELS } from "@/lib/annotationUtils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PartTransferMode } from "@/lib/partTransfer";
import type { VocalPart } from "@/lib/songTypes";
import { cn } from "@/lib/utils";

export type PartTransferScope = "line" | "section" | "song";

type PartTransferMenuProps = {
  scope: PartTransferScope;
  enabledParts: VocalPart[];
  onTransfer: (from: VocalPart, to: VocalPart, mode: PartTransferMode) => void;
  disabled?: boolean;
  className?: string;
};

const SCOPE_TEXT: Record<PartTransferScope, { label: string; aria: string }> = {
  line: { label: "This line", aria: "this line" },
  section: { label: "This section", aria: "this section" },
  song: { label: "Whole song", aria: "the whole song" },
};

const PART_DOT_CLASS: Record<VocalPart, string> = {
  soprano: "bg-cyan-400",
  alto: "bg-violet-400",
  tenor: "bg-amber-400",
  bass: "bg-muted-foreground/50",
};

export function PartTransferMenu({
  scope,
  enabledParts,
  onTransfer,
  disabled = false,
  className,
}: PartTransferMenuProps) {
  const parts = PART_LABELS.filter((part) => enabledParts.includes(part.key));
  const scopeText = SCOPE_TEXT[scope];
  const unavailable = disabled || parts.length < 2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={unavailable}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={unavailable}
            className={cn("text-muted-foreground", className)}
            aria-label={`Move or swap parts for ${scopeText.aria}`}
            title={`Move or swap parts for ${scopeText.aria}`}
          />
        }
      >
        <ArrowLeftRight />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-xs font-medium text-foreground">Move or swap parts</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{scopeText.label}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {parts.map((source) => {
          const destinations = parts.filter((part) => part.key !== source.key);

          return (
            <DropdownMenuSub key={source.key}>
              <DropdownMenuSubTrigger>
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", PART_DOT_CLASS[source.key])}
                />
                <span>{source.label}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Move {source.label} to</DropdownMenuLabel>
                  {destinations.map((destination) => (
                    <DropdownMenuItem
                      key={`move-${destination.key}`}
                      onClick={() => onTransfer(source.key, destination.key, "move")}
                    >
                      <ArrowRight />
                      {destination.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Swap {source.label} with</DropdownMenuLabel>
                  {destinations.map((destination) => (
                    <DropdownMenuItem
                      key={`swap-${destination.key}`}
                      onClick={() => onTransfer(source.key, destination.key, "swap")}
                    >
                      <ArrowLeftRight />
                      {destination.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                  Move empties {source.label}. Swap exchanges both parts.
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
