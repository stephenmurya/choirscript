import { X } from "lucide-react";
import type { Technique } from "@/lib/songTypes";
import { cn } from "@/lib/utils";

type TechniqueBadgeProps = {
  technique: Technique;
  size?: "sm" | "md";
  variant?: "solid" | "soft" | "outline";
  compact?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
};

export function TechniqueBadge({
  technique,
  size,
  variant = "soft",
  compact = true,
  removable = false,
  onRemove,
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
        "technique-badge group/technique relative inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-[6px] border font-semibold leading-none",
        resolvedSize === "sm" ? "px-1.5 py-0.5 text-[0.68rem]" : "px-2.5 py-1.5 text-sm",
        variantClass,
        className,
      )}
      title={`${technique.name}: ${technique.description}`}
    >
      <span className="technique-symbol shrink-0">{technique.symbol}</span>
      <span className="technique-name truncate">{technique.name}</span>
      {removable && onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${technique.name}`}
          className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition hover:bg-destructive/15 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/technique:opacity-100 group-focus-within/technique:opacity-100"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
