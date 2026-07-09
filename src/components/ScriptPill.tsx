import { cn } from "@/lib/utils";

type ScriptPillTone =
  | "neutral"
  | "timing"
  | "hold"
  | "rest"
  | "break"
  | "pickup"
  | "selected";

type ScriptPillProps = {
  symbol?: string;
  label: string;
  tone?: ScriptPillTone;
  className?: string;
};

const toneClass: Record<ScriptPillTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  timing: "border-sky-400/40 bg-sky-500/10 text-sky-100",
  hold: "border-orange-400/40 bg-orange-500/10 text-orange-100",
  rest: "border-muted bg-muted text-muted-foreground",
  break: "border-rose-400/40 bg-rose-500/10 text-rose-100",
  pickup: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  selected: "border-primary/45 bg-primary/20 text-foreground ring-1 ring-primary/35",
};

export function ScriptPill({
  symbol,
  label,
  tone = "neutral",
  className,
}: ScriptPillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-[6px] border px-2 py-0.5 text-xs font-medium leading-none",
        toneClass[tone],
        className,
      )}
    >
      {symbol ? <span className="shrink-0">{symbol}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
