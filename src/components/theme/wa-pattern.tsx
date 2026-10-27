"use client";

import type { CSSProperties } from "react";
import type { Pattern } from "@/lib/theme";
import { useThemeStore } from "./theme-provider";

/**
 * 和柄（青海波・七宝・市松）。色は CSS 変数で指定するため、テーマ変更に追従します。
 */
export function WaPattern({
  className,
  id,
  variant,
  fill = "var(--color-sidebar-pattern)",
  line = "var(--color-sidebar-pattern-line)",
  size = 20,
}: {
  className?: string;
  id: string;
  variant?: Pattern;
  fill?: string;
  line?: string;
  size?: number;
}) {
  const themePattern = useThemeStore((s) => s.theme.pattern);
  const kind = variant ?? themePattern;
  if (kind === "none") return null;
  const r = size;
  const fillStyle: CSSProperties = { fill };
  const lineStyle: CSSProperties = { fill: "none", stroke: line, strokeWidth: 1 };

  let tile: React.ReactNode;
  let w = 2 * r;
  let h = r;
  if (kind === "seigaiha") {
    const centers: [number, number][] = [
      [r, -r / 2],
      [0, 0],
      [2 * r, 0],
      [r, r / 2],
      [0, r],
      [2 * r, r],
      [r, (3 * r) / 2],
    ];
    tile = centers.map(([cx, cy], i) => (
      <g key={i}>
        <circle cx={cx} cy={cy} r={r} style={{ ...fillStyle, stroke: line, strokeWidth: 1 }} />
        <circle cx={cx} cy={cy} r={r * 0.75} style={lineStyle} />
        <circle cx={cx} cy={cy} r={r * 0.5} style={lineStyle} />
        <circle cx={cx} cy={cy} r={r * 0.25} style={lineStyle} />
      </g>
    ));
  } else if (kind === "shippo") {
    w = 2 * r;
    h = 2 * r;
    tile = (
      <>
        <rect width={w} height={h} style={fillStyle} />
        {[
          [0, 0],
          [2 * r, 0],
          [0, 2 * r],
          [2 * r, 2 * r],
          [r, r],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} style={lineStyle} />
        ))}
      </>
    );
  } else {
    w = 2 * r;
    h = 2 * r;
    tile = (
      <>
        <rect width={w} height={h} style={fillStyle} />
        <rect x={0} y={0} width={r} height={r} style={{ fill: line }} />
        <rect x={r} y={r} width={r} height={r} style={{ fill: line }} />
      </>
    );
  }

  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={`${id}-${kind}`} width={w} height={h} patternUnits="userSpaceOnUse">
          {tile}
        </pattern>
      </defs>
      <rect width="100%" height="100%" style={{ fill: `url(#${id}-${kind})` }} />
    </svg>
  );
}
