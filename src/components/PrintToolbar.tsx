"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PrintToolbarProps = {
  songId: string;
  blackAndWhite: boolean;
};

export function PrintToolbar({
  songId,
  blackAndWhite,
}: PrintToolbarProps) {
  function handlePrint() {
    // MVP uses the browser print dialog. Server-side PDF rendering can be added
    // later with a dedicated PDF service or a Node/Docker rendering service.
    if (!blackAndWhite) toast.info("For color printouts, enable Background graphics in the browser print dialog.");
    window.print();
  }

  return (
    <div className="no-print sticky top-0 z-30 border-b border-border bg-background px-3 py-3 shadow-sm sm:px-4">
      <div className="mx-auto flex max-w-[900px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Rehearsal View
          </p>
          <h1 className="text-lg font-semibold text-foreground">ChoirScript</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href={`/songs/${songId}`} />} variant="outline">
            Back to Editor
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
          >
            <Printer data-icon="inline-start" />
            {blackAndWhite ? "Print black and white" : "Preview & Print"}
          </Button>
        </div>
      </div>
    </div>
  );
}
