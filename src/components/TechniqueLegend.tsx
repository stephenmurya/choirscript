import { DEFAULT_TECHNIQUES } from "@/lib/defaultTechniques";
import { TechniqueBadge } from "./TechniqueBadge";

type TechniqueLegendProps = {
  compact?: boolean;
};

export function TechniqueLegend({ compact = false }: TechniqueLegendProps) {
  return (
    <section className="technique-legend rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Technique Legend
      </h2>
      <div
        className={
          compact
            ? "mt-3 flex flex-wrap gap-2"
            : "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {DEFAULT_TECHNIQUES.map((technique) => (
          <div
            key={technique.id}
            className={`rounded-md border px-3 py-2 text-sm ${technique.colorClass}`}
            title={`${technique.name}: ${technique.description}`}
          >
            <TechniqueBadge technique={technique} compact={compact} className="border-0 bg-transparent p-0" />
            {!compact ? (
              <p className="mt-1 text-xs opacity-85">{technique.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
