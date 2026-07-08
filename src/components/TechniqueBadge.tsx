import type { Technique } from "@/lib/songTypes";

type TechniqueBadgeProps = {
  technique: Technique;
  compact?: boolean;
  className?: string;
};

export function TechniqueBadge({
  technique,
  compact = true,
  className = "",
}: TechniqueBadgeProps) {
  return (
    <span
      className={`technique-badge inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border font-semibold leading-none ${technique.colorClass} ${
        compact ? "px-1.5 py-0.5 text-[0.68rem]" : "px-3 py-2 text-sm"
      } ${className}`}
      title={`${technique.name}: ${technique.description}`}
    >
      <span className="technique-symbol shrink-0">{technique.symbol}</span>
      <span className="technique-name truncate">{technique.name}</span>
    </span>
  );
}
