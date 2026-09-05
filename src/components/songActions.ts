"use client";

import type { ComponentType } from "react";
import {
  Copy,
  Eye,
  Share2,
  Trash,
  type LucideProps,
} from "lucide-react";
import type { SongMeta } from "@/lib/firebase/types";

/**
 * Single source of truth for song actions. Both the card "More" dropdown and
 * the right-click context menu render from this list — action logic, labels
 * and ordering are defined exactly once.
 */
export type SongAction = {
  id: "open" | "rehearsal" | "share" | "duplicate" | "delete";
  label: string;
  icon: ComponentType<LucideProps>;
  destructive?: boolean;
  separatorBefore?: boolean;
};

export const SONG_ACTIONS: SongAction[] = [
  { id: "open", label: "Open", icon: Copy },
  { id: "rehearsal", label: "Rehearsal / Preview", icon: Eye },
  { id: "share", label: "Share", icon: Share2 },
  { id: "duplicate", label: "Duplicate", icon: Copy, separatorBefore: true },
  { id: "delete", label: "Delete", icon: Trash, destructive: true, separatorBefore: true },
];

export type SongActionHandlers = {
  onOpen: (song: SongMeta) => void;
  onRehearsal: (song: SongMeta) => void;
  onShare: (song: SongMeta) => void;
  onDuplicate: (song: SongMeta) => void;
  onDelete: (song: SongMeta) => void;
};

export function runSongAction(
  action: SongAction,
  song: SongMeta,
  handlers: SongActionHandlers,
) {
  switch (action.id) {
    case "open":
      handlers.onOpen(song);
      break;
    case "rehearsal":
      handlers.onRehearsal(song);
      break;
    case "share":
      handlers.onShare(song);
      break;
    case "duplicate":
      handlers.onDuplicate(song);
      break;
    case "delete":
      handlers.onDelete(song);
      break;
  }
}
