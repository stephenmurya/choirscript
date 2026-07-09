import type { CSSProperties, ReactNode } from "react";

type TimingGridProps = {
  totalUnits: number;
  children: ReactNode;
  className?: string;
};

export function TimingGrid({ totalUnits, children, className = "" }: TimingGridProps) {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `var(--line-label-col, 2.75rem) repeat(${Math.max(
      totalUnits,
      1,
    )}, var(--timing-unit-width, 3.5rem))`,
  };

  return (
    <div
      className={`line-grid-shell timing-grid grid w-max min-w-0 items-center gap-x-1 gap-y-1.5 pr-3 ${className}`}
      style={gridStyle}
    >
      {children}
    </div>
  );
}
