import { ScriptPill } from "./ScriptPill";

export function TimingLegend() {
  return (
    <div className="timing-legend rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Timing legend
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <ScriptPill symbol="Pickup" label="Pickup bar" tone="pickup" />
        <ScriptPill symbol="—" label="Hold" tone="hold" />
        <ScriptPill symbol="⏸" label="Rest" tone="rest" />
        <ScriptPill symbol="//" label="Break" tone="break" />
      </div>
    </div>
  );
}
