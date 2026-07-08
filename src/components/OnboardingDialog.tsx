"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        complete();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) {
    return null;
  }

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  function complete() {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    onOpenChange(false);
    setStepIndex(0);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          complete();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Tip {stepIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={complete}
            className="min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            Skip
          </button>
        </div>
        <h2 id="onboarding-title" className="mt-4 text-2xl font-semibold text-slate-950">
          {step.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 w-6 rounded-full ${
                  index === stepIndex ? "bg-cyan-700" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                complete();
                return;
              }

              setStepIndex((current) => current + 1);
            }}
            className="min-h-11 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}
