"use client";

import { normalizeNoteInput } from "@/lib/notation";
import type { PartKey } from "@/lib/songTypes";

type NotationInputProps = {
  value: string;
  onChange: (value: string) => void;
  part: PartKey;
  syllableId: string;
  syllableText: string;
  lineId: string;
  lineIndex: number;
  index: number;
};

const partOrder: PartKey[] = ["soprano", "alto", "tenor", "bass"];

function allNotationInputs() {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('[data-notation-input="true"]'),
  );
}

function focusInput(input: HTMLInputElement | undefined) {
  if (!input) {
    return;
  }

  input.focus();
  input.select();
}

function findByDataset(part: PartKey, lineId: string, index: number) {
  return allNotationInputs().find(
    (input) =>
      input.dataset.part === part &&
      input.dataset.lineId === lineId &&
      Number(input.dataset.syllableIndex) === index,
  );
}

function moveAlongPart(current: HTMLInputElement, direction: 1 | -1) {
  const rowInputs = allNotationInputs().filter((input) => input.dataset.part === current.dataset.part);
  const currentIndex = rowInputs.indexOf(current);
  focusInput(rowInputs[currentIndex + direction]);
}

function moveVertical(current: HTMLInputElement, direction: 1 | -1) {
  const currentPart = current.dataset.part as PartKey | undefined;

  if (!currentPart) {
    return;
  }

  const currentPartIndex = partOrder.indexOf(currentPart);
  const nextPart = partOrder[currentPartIndex + direction];

  if (!nextPart || current.dataset.lineId === undefined) {
    return;
  }

  focusInput(findByDataset(nextPart, current.dataset.lineId, Number(current.dataset.syllableIndex)));
}

export function NotationInput({
  value,
  onChange,
  part,
  syllableId,
  syllableText,
  lineId,
  lineIndex,
  index,
}: NotationInputProps) {
  return (
    <input
      aria-label={`${part} notation for ${syllableText}`}
      data-notation-input="true"
      data-part={part}
      data-line-id={lineId}
      data-line-index={lineIndex}
      data-syllable-id={syllableId}
      data-syllable-index={index}
      value={value}
      readOnly
      inputMode="none"
      onKeyDown={(event) => {
        const input = event.currentTarget;
        const normalizedNote = normalizeNoteInput(event.key);

        if (normalizedNote) {
          event.preventDefault();
          onChange(normalizedNote);
          window.requestAnimationFrame(() => moveAlongPart(input, 1));
          return;
        }

        if (/^[a-z]$/i.test(event.key)) {
          event.preventDefault();
          return;
        }

        if (event.key === "Backspace") {
          event.preventDefault();

          if (value) {
            onChange("");
            return;
          }

          moveAlongPart(input, -1);
          return;
        }

        if (event.key === "Delete") {
          event.preventDefault();
          onChange("");
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveAlongPart(input, 1);
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveAlongPart(input, -1);
          return;
        }

        if (event.key === "ArrowDown" || event.key === "Enter") {
          event.preventDefault();
          moveVertical(input, 1);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveVertical(input, -1);
        }
      }}
      className="h-9 w-11 min-w-11 justify-self-center rounded-md border border-slate-300 bg-slate-50 px-1.5 text-center text-[0.82rem] font-medium text-slate-800 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100 sm:h-8 sm:w-10 sm:min-w-10 sm:text-[0.78rem]"
    />
  );
}
