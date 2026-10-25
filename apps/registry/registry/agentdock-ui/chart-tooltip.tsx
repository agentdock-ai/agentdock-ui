"use client";
import { useState, type ReactNode } from "react";
export function ChartTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <g
      tabIndex={0}
      aria-label={label}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="outline-none focus-visible:opacity-70"
    >
      <title>{label}</title>
      {children}
      {visible && (
        <foreignObject
          x={0}
          y={0}
          width={200}
          height={32}
          className="pointer-events-none overflow-visible"
        >
          <span
            role="tooltip"
            className="inline-block rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          >
            {label}
          </span>
        </foreignObject>
      )}
    </g>
  );
}
