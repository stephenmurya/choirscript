"use client";

import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SharedPageActions() {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.info("Copy failed. Use the browser address bar to copy this link.");
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={copyLink}>
        <Copy data-icon="inline-start" />
        Copy link
      </Button>
      <Button type="button" onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print / Save PDF
      </Button>
    </div>
  );
}
