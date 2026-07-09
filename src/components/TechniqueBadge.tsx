import type { Technique } from "@/lib/songTypes";
import { cn } from "@/lib/utils";

type TechniqueBadgeProps = {
  technique: Technique;
  size?: "sm" | "md";
  variant?: "solid" | "soft" | "outline";
  compact?: boolean;
  className?: string;
};

export function TechniqueBadge({
  technique,
  size,
  variant = "soft",
  compact = true,
  className = "",
}: TechniqueBadgeProps) {
  const resolvedSize = size ?? (compact ? "sm" : "md");
  const variantClass = {
    solid: technique.colorClass,
    soft: technique.colorClass,
    outline: `bg-transparent ${technique.borderClass}`,
  }[variant];

  return (
    <span
      className={cn(
        "technique-badge inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-[6px] border font-semibold leading-none",
        resolvedSize === "sm" ? "px-1.5 py-0.5 text-[0.68rem]" : "px-2.5 py-1.5 text-sm",
        variantClass,
        className,
      )}
      title={`${technique.name}: ${technique.description}`}
    >
      <span className="technique-symbol shrink-0">{technique.symbol}</span>
      <span className="technique-name truncate">{technique.name}</span>
    </span>
  );
}
