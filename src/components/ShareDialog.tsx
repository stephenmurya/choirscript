"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Loader2, Radio, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Song, SongShare } from "@/lib/songTypes";
import { publishShareHead } from "@/lib/shareHeads";
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
  /** Persist the new link + edit token onto the song so saves can republish. */
  onShareCreated?: (share: SongShare) => void;
};

type ShareResponse = {
  shareId: string;
  editToken?: string;
  revision?: number;
  url: string;
  error?: string;
  diagnostic?: string;
};

export function ShareDialog({ song, open, onOpenChange, onShareCreated }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const existingShare = song?.share ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const existingUrl =
      existingShare && typeof window !== "undefined"
        ? `${window.location.origin}/s/${existingShare.id}`
        : "";

    const resetId = window.setTimeout(() => {
      setShareUrl(existingUrl);
      setIsCreating(false);
      setIsPublishing(false);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [open, song?.id, existingShare]);

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
        throw new Error(
          result.diagnostic
            ? `${result.error || "Could not create share link"} (${result.diagnostic})`
            : result.error || "Could not create share link",
        );
      }

      setShareUrl(result.url);

      if (result.editToken) {
        onShareCreated?.({
          id: result.shareId,
          editToken: result.editToken,
          publishedAt: new Date().toISOString(),
        });

        // Seed the doorbell so the very first edit after creating the link can be
        // pushed to anyone who already has the page open.
        void publishShareHead(
          result.shareId,
          result.revision ?? 1,
          new Date().toISOString(),
        );
      }

      toast.success("Live link created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create share link",
      );
    } finally {
      setIsCreating(false);
    }
  }

  /** Manual publish — the editor already republishes automatically on save. */
  async function publishNow() {
    if (!song || !existingShare) {
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch(`/api/share/${existingShare.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ editToken: existingShare.editToken, song }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Could not publish the latest version");
      }

      const published = (await response.json()) as { revision?: number; updatedAt?: string };

      if (typeof published.revision === "number") {
        void publishShareHead(
          existingShare.id,
          published.revision,
          published.updatedAt ?? new Date().toISOString(),
        );
      }

      toast.success("Latest version published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish");
    } finally {
      setIsPublishing(false);
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
              {existingShare ? (
                <Badge variant="secondary" className="gap-1">
                  <Radio className="size-3" />
                  Live
                </Badge>
              ) : null}
              <span>{song?.title || "Untitled Song"}</span>
            </div>
            <p className="mt-3">
              Anyone with this link can open the rehearsal view and print it. They cannot edit your
              song.
            </p>
            <p className="mt-2">
              The link always shows the current version: when you save, open rehearsal pages update
              on their own within a few seconds.
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
                Send this link to anyone who needs the rehearsal sheet. It stays the same link as
                your song changes.
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
              {existingShare ? (
                <Button type="button" variant="outline" disabled={isPublishing} onClick={publishNow}>
                  {isPublishing ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : null}
                  {isPublishing ? "Publishing..." : "Publish now"}
                </Button>
              ) : null}
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
