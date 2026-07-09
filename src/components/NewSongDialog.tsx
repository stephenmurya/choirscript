"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/songTypes";
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
import { Label } from "@/components/ui/label";

type NewSongDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (
    metadata: Pick<Song, "title"> & Partial<Pick<Song, "artist" | "key" | "tempo">>,
  ) => void;
};

export function NewSongDialog({ open, onClose, onCreate }: NewSongDialogProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [tempo, setTempo] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const resetFields = useCallback(() => {
    setTitle("");
    setArtist("");
    setKeyValue("");
    setTempo("");
  }, []);

  const close = useCallback(() => {
    resetFields();
    onClose();
  }, [onClose, resetFields]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => titleRef.current?.focus(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const canCreate = title.trim().length > 0;

  function submit() {
    if (!canCreate) {
      return;
    }

    onCreate({
      title: title.trim(),
      artist: artist.trim(),
      key: keyValue.trim(),
      tempo: tempo.trim(),
    });
    resetFields();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new song</DialogTitle>
          <DialogDescription>
            Add the rehearsal context now so the document starts with a clear title.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Label className="flex flex-col gap-2">
            Song title
            <Input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCreate) {
                  event.preventDefault();
                  submit();
                }
              }}
              aria-invalid={!canCreate}
              placeholder="Great is Thy Faithfulness"
            />
          </Label>
          {!canCreate ? (
            <p className="-mt-2 text-xs font-medium text-muted-foreground">Song title is required.</p>
          ) : null}
          <Label className="flex flex-col gap-2">
            Artist/Singer optional
            <Input value={artist} onChange={(event) => setArtist(event.target.value)} />
          </Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="flex flex-col gap-2">
              Key optional
              <Input value={keyValue} onChange={(event) => setKeyValue(event.target.value)} />
            </Label>
            <Label className="flex flex-col gap-2">
              BPM optional
              <Input value={tempo} onChange={(event) => setTempo(event.target.value)} />
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!canCreate}>
            Create Song
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
