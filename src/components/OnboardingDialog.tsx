"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ONBOARDING_KEY = "choirscript:onboarding-complete";

type OnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoShow?: boolean;
};

const steps = [
  {
    title: "Welcome to ChoirScript",
    body: "ChoirScript helps music directors create simple annotated choir scripts without full sheet music.",
  },
  {
    title: "Start with lyrics",
    body: "Paste or type lyrics. ChoirScript breaks them into syllables so each syllable can receive a part.",
  },
  {
    title: "Type parts fast",
    body: "Click a notation box and type D, R, M, F, S, Z, L, or T. ChoirScript fills Do, Re, Mi, Fa, So, Ze, La, or Ti and moves to the next box automatically.",
  },
  {
    title: "Use / for commands",
    body: "Click an empty line and type / to open the command menu. For now, you can create a new section this way.",
  },
  {
    title: "Highlight lyrics for technique",
    body: "Drag across lyric syllables to highlight them, then choose techniques like Slur, Staccato, Accent, Breath, Hold, or Cutoff.",
  },
  {
    title: "Preview and export",
    body: "Use Preview to check the rehearsal version. Use Print / Save PDF to export from your browser.",
  },
];

export function OnboardingDialog({
  open,
  onOpenChange,
  autoShow = false,
}: OnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!autoShow || typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(ONBOARDING_KEY) !== "true") {
      onOpenChange(true);
    }
  }, [autoShow, onOpenChange]);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  function complete() {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    onOpenChange(false);
    setStepIndex(0);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          complete();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Tip {stepIndex + 1} of {steps.length}
          </p>
          <DialogTitle className="text-2xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base leading-7">{step.body}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 w-6 rounded-full ${
                index === stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
          >
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={complete}>
            Skip
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isLast) {
                complete();
                return;
              }

              setStepIndex((current) => current + 1);
            }}
          >
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
