"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { resolveSeason, type Season } from "@/lib/theme";
import { useThemeStore } from "./theme-provider";

const SAKURA = "M12 3c1.6 2.2 4.6 3.4 5.4 6.2.9 3.2-1.4 6.6-4.6 7.6L12 21l-.8-4.2C8 15.8 5.7 12.4 6.6 9.2 7.4 6.4 10.4 5.2 12 3Z";
const MOMIJI =
  "M12 2.5l1.3 4 2.9-2.2-.6 3.9 3.8-1-2.2 3.2 3.9.8-3.4 2 2.5 2.4-3.9-.2.6 3.3-3.1-1.9-.9 3.7h-1.8l-.9-3.7-3.1 1.9.6-3.3-3.9.2 2.5-2.4-3.4-2 3.9-.8-2.2-3.2 3.8 1-.6-3.9 2.9 2.2z";

const PALETTE: Record<string, string[]> = {
  sakura: ["#f7c6d0", "#f3a9b9", "#fbdbe2", "#eea0b2"],
  momiji: ["#d9481c", "#e8762c", "#c7341a", "#efa52d", "#b8321f"],
  yuki: ["#ffffff", "#f4f8fb", "#e9f1f7"],
  hotaru: ["#e6f59a", "#d4ef7a", "#f2ffb8"],
};

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** 季節の演出（桜・紅葉・雪・蛍）。動きの設定が「軽やか」のときのみ表示 */
export function SeasonalParticles({ count = 14, height = 220, season: override }: { count?: number; height?: number; season?: Season }) {
  const setting = useThemeStore((s) => s.theme.season);
  const motion = useThemeStore((s) => s.theme.motion);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const season = resolveSeason(override ?? setting);
  if (!mounted || season === "none" || motion !== "full") return null;
  const colors = PALETTE[season];

  return (
    <div className="fx-full pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const r1 = rand(i + 1);
        const r2 = rand(i + 11);
        const r3 = rand(i + 23);
        const size = season === "yuki" ? 3 + r1 * 5 : season === "hotaru" ? 3 + r1 * 3 : season === "momiji" ? 14 + r1 * 10 : 11 + r1 * 9;
        const style: CSSProperties & Record<string, string | number> = {
          left: `${r2 * 100}%`,
          top: season === "hotaru" ? `${20 + r3 * 70}%` : "-24px",
          width: size,
          height: size,
          color: colors[i % colors.length],
          animation:
            season === "hotaru"
              ? `glow ${3 + r1 * 3}s ease-in-out ${r3 * 4}s infinite`
              : `fall ${(season === "yuki" ? 7 : 9) + r1 * 6}s linear ${-r3 * 12}s infinite${season === "yuki" ? "" : `, sway ${3 + r2 * 2}s ease-in-out infinite`}`,
          "--p-drift": `${(r2 - 0.3) * 120}px`,
          "--p-dist": `${height + 40}px`,
          "--p-rot": `${(r3 > 0.5 ? 1 : -1) * (240 + r1 * 360)}deg`,
          "--p-op": season === "yuki" ? 0.95 : 0.85,
        };
        return (
          <span key={i} className="absolute block" style={style}>
            {season === "sakura" && (
              <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-sm">
                <path d={SAKURA} fill="currentColor" />
              </svg>
            )}
            {season === "momiji" && (
              <svg viewBox="0 0 24 24" className="h-full w-full">
                <path d={MOMIJI} fill="currentColor" />
              </svg>
            )}
            {season === "yuki" && <span className="block h-full w-full rounded-full bg-current opacity-90 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />}
            {season === "hotaru" && <span className="block h-full w-full rounded-full bg-current shadow-[0_0_10px_3px_rgba(220,245,120,0.7)]" />}
          </span>
        );
      })}
    </div>
  );
}

export const SEASON_LABEL: Record<Exclude<Season, "auto">, string> = {
  sakura: "桜",
  momiji: "紅葉",
  yuki: "雪",
  hotaru: "蛍",
  none: "なし",
};
