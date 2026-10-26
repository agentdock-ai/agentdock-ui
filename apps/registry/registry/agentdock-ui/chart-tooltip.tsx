"use client";
import { useState, type ReactNode } from "react";

/** A focusable data point whose tooltip is drawn beside it, kept inside the chart. */
export function ChartTooltip({
  label,
  x,
  y,
  width,
  fontSize = 13,
  children,
}: {
  label: string;
  /** Anchor point in the chart's viewBox units. */
  x: number;
  y: number;
  /** The chart's viewBox width, used to keep the tooltip on screen. */
  width: number;
  fontSize?: number;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const padding = fontSize * 0.6;
  const boxWidth = label.length * fontSize * 0.56 + padding * 2;
  const boxHeight = fontSize + padding * 1.6;
  const left = Math.min(Math.max(x - boxWidth / 2, 0), width - boxWidth);
  const top =
    y - boxHeight - fontSize * 0.6 < 0
      ? y + fontSize
      : y - boxHeight - fontSize * 0.6;
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
        <g role="tooltip" className="pointer-events-none">
          <rect
            x={left}
            y={top}
            width={boxWidth}
            height={boxHeight}
            rx={fontSize * 0.45}
            className="fill-card stroke-border"
          />
          <text
            x={left + padding}
            y={top + boxHeight / 2}
            dominantBaseline="central"
            style={{ fontSize }}
            className="fill-foreground"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
