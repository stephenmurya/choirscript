"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type PrintToolbarProps = {
  songId: string;
  blackAndWhite: boolean;
  onBlackAndWhiteChange: (value: boolean) => void;
};

export function PrintToolbar({
  songId,
  blackAndWhite,
  onBlackAndWhiteChange,
}: PrintToolbarProps) {
  function handlePrint() {
    // MVP uses the browser print dialog. Server-side PDF rendering can be added
    // later with a dedicated PDF service or a Node/Docker rendering service.
    window.print();
  }

  return (
    <div className="no-print sticky top-0 z-20 border-b border-border bg-background/90 px-3 py-3 backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-[900px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Rehearsal View
          </p>
          <h1 className="text-lg font-semibold text-foreground">ChoirScript</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-9 items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
            <Switch
              checked={blackAndWhite}
              onCheckedChange={onBlackAndWhiteChange}
            />
            Simple B&W
          </label>
          <Button render={<Link href={`/songs/${songId}`} />} variant="outline">
            Back to Editor
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
          >
            <Printer data-icon="inline-start" />
            {blackAndWhite ? "Print Simple PDF" : "Color PDF / Print"}
          </Button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-[900px] text-xs text-muted-foreground">
        For colorful PDFs, enable Background graphics in the browser print dialog if needed.
      </p>
    </div>
  );
}
