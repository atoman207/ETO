"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BOOT_KEY, buildTheme, DEFAULT_THEME, PRESETS, type Theme } from "@/lib/theme";

const COLOR_KEYS: (keyof Theme)[] = ["primary", "accent", "background", "surface", "seal", "neutral", "sidebar", "pattern"];

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  version: number;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  setTheme: (patch: Partial<Theme>) => void;
  applyPreset: (id: string) => void;
  reset: () => void;
  importTheme: (t: Partial<Theme>) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      hydrated: false,
      version: 0,
      panelOpen: false,
      setPanelOpen: (v) => set({ panelOpen: v }),
      setTheme: (patch) =>
        set((s) => {
          const touchesColor = Object.keys(patch).some((k) => COLOR_KEYS.includes(k as keyof Theme));
          return { theme: { ...s.theme, ...patch, presetId: patch.presetId ?? (touchesColor ? "custom" : s.theme.presetId) } };
        }),
      applyPreset: (id) =>
        set((s) => {
          const p = PRESETS.find((x) => x.id === id);
          return p ? { theme: { ...s.theme, ...p.values, presetId: id } } : {};
        }),
      reset: () => set({ theme: { ...DEFAULT_THEME } }),
      importTheme: (t) => set({ theme: { ...DEFAULT_THEME, ...t } }),
    }),
    {
      name: "takumicho-theme",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ theme: s.theme }),
      merge: (persisted, current) => {
        const p = persisted as { theme?: Partial<Theme> } | undefined;
        return { ...current, theme: { ...DEFAULT_THEME, ...(p?.theme ?? {}) } };
      },
    },
  ),
);

let appliedKeys: string[] = [];

function applyTheme(theme: Theme) {
  const out = buildTheme(theme);
  const root = document.documentElement;
  appliedKeys.forEach((k) => {
    if (!(k in out.vars)) root.style.removeProperty(k);
  });
  // 起動スクリプトが設定した値も含め、不要になった変数を除去
  Array.from(root.style)
    .filter((k) => k.startsWith("--") && !(k in out.vars))
    .forEach((k) => root.style.removeProperty(k));
  Object.entries(out.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  appliedKeys = Object.keys(out.vars);
  Object.entries(out.attrs).forEach(([k, v]) => root.setAttribute(k, v));

  let link = document.getElementById("theme-font-link") as HTMLLinkElement | null;
  if (out.fontUrl) {
    if (!link) {
      link = document.createElement("link");
      link.id = "theme-font-link";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== out.fontUrl) link.href = out.fontUrl;
  } else if (link) {
    link.remove();
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", out.themeColor);
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify({ v: out.vars, a: out.attrs, f: out.fontUrl, c: out.themeColor }));
  } catch {
    // 保存できない環境（プライベートモード等）では毎回既定テーマで表示
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const hydrated = useThemeStore((s) => s.hydrated);

  useEffect(() => {
    Promise.resolve(useThemeStore.persist.rehydrate())
      .catch(() => undefined)
      .then(() => useThemeStore.setState({ hydrated: true }));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);
    useThemeStore.setState((s) => ({ version: s.version + 1 }));
  }, [theme, hydrated]);

  return <MotionConfig reducedMotion={theme.motion === "none" ? "always" : theme.followOs ? "user" : "never"}>{children}</MotionConfig>;
}

/** グラフ等の SVG 属性で使うため、CSS 変数の実際の色を取得 */
export function useThemeColors<K extends string>(names: K[]): Record<K, string> {
  const version = useThemeStore((s) => s.version);
  const key = names.join("|");
  return useMemo(() => {
    const out = {} as Record<K, string>;
    const cs = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
    names.forEach((n) => (out[n] = cs?.getPropertyValue(n).trim() || "#888888"));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, key]);
}

export function useMotionLevel() {
  return useThemeStore((s) => s.theme.motion);
}
