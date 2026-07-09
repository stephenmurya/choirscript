"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Song } from "@/lib/songTypes";
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
import { Input } from "@/components/ui/input";

type ShareDialogProps = {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShareResponse = {
  shareId: string;
  url: string;
  error?: string;
};

export function ShareDialog({ song, open, onOpenChange }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const resetId = window.setTimeout(() => {
      setShareUrl("");
      setIsCreating(false);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [open, song?.id]);

  async function copyShareLink(url = shareUrl) {
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      toast.info("Copy failed. The link is selected so you can copy it manually.");
    }
  }

  async function createShareLink() {
    if (!song) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ song }),
      });
      const result = (await response.json()) as ShareResponse;

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Could not create share link");
      }

      setShareUrl(result.url);
      toast.success("Share link created");
    } catch {
      toast.error("Could not create share link");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-muted-foreground" />
            <DialogTitle>Share this song</DialogTitle>
          </div>
          <DialogDescription>
            Create a view-only link you can send to singers, choir members, or other directors.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">View-only</Badge>
              <span>{song?.title || "Untitled Song"}</span>
            </div>
            <p className="mt-3">
              Anyone with this link can open the rehearsal view and print it. They cannot edit
              your song.
            </p>
            <p className="mt-2">
              This link keeps the song exactly as it is right now. If you make changes later,
              create a new link to share the updated version.
            </p>
          </div>

          {shareUrl ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="share-url">
                Ready to share
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  ref={inputRef}
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={() => copyShareLink()}>
                  <Copy data-icon="inline-start" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this link to anyone who needs the rehearsal sheet. This version will stay the
                same, even if you keep editing your song.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use this when you want people to review, rehearse, or print the song without changing
              your working copy.
            </p>
          )}
        </div>

        <DialogFooter>
          {shareUrl ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink data-icon="inline-start" />
                Open link
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isCreating}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={isCreating || !song?.title?.trim()} onClick={createShareLink}>
                {isCreating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                {isCreating ? "Creating..." : "Create share link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
