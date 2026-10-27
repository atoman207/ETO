"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Palette, RotateCcw, Sparkles, Type, Upload, X, Shapes } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/format";
import { contrast, normalizeHex, primaryRamp, accentRamp, STEPS } from "@/lib/color";
import { FONTS, NEUTRAL_TONES, PRESETS, resolveSeason, SIDEBAR_STYLES, type Season, type Theme } from "@/lib/theme";
import { useThemeStore } from "./theme-provider";
import { WaPattern } from "./wa-pattern";
import { SeasonalParticles, SEASON_LABEL } from "./seasonal";

type Section = "color" | "font" | "shape" | "motion";

const SAMPLE = "案件一覧 工事番号 K26-118 ¥12,345,000 御見積書";
const PREVIEW_CHARS = Array.from(new Set((SAMPLE + FONTS.map((f) => f.label).join("") + "0123456789").split(""))).join("");

export function ThemePanel() {
  const open = useThemeStore((s) => s.panelOpen);
  const setOpen = useThemeStore((s) => s.setPanelOpen);
  const [section, setSection] = useState<Section>("color");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // フォント見本用：見本の文字だけを読み込む軽量リクエスト
    if (!document.getElementById("theme-font-preview")) {
      const fams = FONTS.filter((f) => f.google).map((f) => `family=${f.google!.split(":")[0]}`).join("&");
      const link = document.createElement("link");
      link.id = "theme-font-preview";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?${fams}&text=${encodeURIComponent(PREVIEW_CHARS)}&display=swap`;
      document.head.appendChild(link);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-ai-950/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            role="dialog"
            aria-label="表示デザインの設定"
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-surface shadow-2xl ring-1 ring-stone-200"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="relative overflow-hidden border-b border-stone-100 px-5 pb-3 pt-4">
              <WaPattern className="pointer-events-none absolute inset-0 h-full w-full opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" id="wa-panel" fill="transparent" line="color-mix(in oklab, var(--color-ai-500) 14%, transparent)" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="font-heading flex items-center gap-2 text-base font-bold text-stone-900">
                    <Palette size={18} className="text-ai-600" />
                    表示デザインの設定
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-stone-500">変更はすぐに画面へ反映され、このブラウザに保存されます</p>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label="閉じる">
                  <X size={18} />
                </button>
              </div>
              <div className="relative mt-3 grid grid-cols-4 gap-1 rounded-lg bg-stone-100 p-1">
                {(
                  [
                    ["color", "配色", <Palette key="c" size={14} />],
                    ["font", "文字", <Type key="f" size={14} />],
                    ["shape", "形・質感", <Shapes key="s" size={14} />],
                    ["motion", "動き", <Sparkles key="m" size={14} />],
                  ] as [Section, string, ReactNode][]
                ).map(([k, label, icon]) => (
                  <button key={k} onClick={() => setSection(k)} className={cn("relative flex h-8 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors", section === k ? "text-ai-800" : "text-stone-500 hover:text-stone-800")}>
                    {section === k && <motion.span layoutId="theme-tab" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                    <span className="relative flex items-center gap-1">
                      {icon}
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div key={section} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }} className="space-y-6">
                  {section === "color" && <ColorSection />}
                  {section === "font" && <FontSection />}
                  {section === "shape" && <ShapeSection />}
                  {section === "motion" && <MotionSection />}
                </motion.div>
              </AnimatePresence>
            </div>
            <PanelFooter />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[0.8125rem] font-bold text-stone-700">
          <span className="h-3.5 w-1 rounded-full bg-shu-500" />
          {title}
        </h4>
        {hint && <span className="text-[0.625rem] text-stone-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chips<T extends string | number>({ value, options, onChange, cols = 3 }: { value: T; options: { value: T; label: string; note?: string }[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={cn("relative rounded-lg border px-2.5 py-2 text-left transition-all", on ? "border-ai-500 bg-ai-50 ring-2 ring-ai-500/15" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50")}
          >
            <span className={cn("block text-xs font-medium", on ? "text-ai-800" : "text-stone-700")}>{o.label}</span>
            {o.note && <span className="mt-0.5 block text-[0.625rem] leading-tight text-stone-500">{o.note}</span>}
            {on && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ai-600 text-white">
                <Check size={9} strokeWidth={4} />
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({ label, value, onChange, ramp, note }: { label: string; value: string; onChange: (v: string) => void; ramp?: Record<number, string>; note?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="rounded-lg border border-stone-200 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-inner ring-1 ring-black/10" style={{ background: value }}>
          <input type="color" value={normalizeHex(value) ?? "#000000"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} />
        </label>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-stone-700">{label}</div>
          {note && <div className="text-[0.625rem] text-stone-500">{note}</div>}
        </div>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = normalizeHex(e.target.value);
            if (n) onChange(n);
          }}
          className="font-num h-7 w-24 rounded-md border border-stone-300 bg-surface px-2 text-xs uppercase text-stone-700 focus:border-ai-500 focus:outline-none"
          aria-label={`${label}（16進数）`}
        />
      </div>
      {ramp && (
        <div className="mt-2 flex overflow-hidden rounded-md ring-1 ring-black/5">
          {STEPS.map((s, i) => (
            <motion.span key={s} title={`${s}：${ramp[s]}`} className="h-4 flex-1" style={{ background: ramp[s] }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.02 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ColorSection() {
  const theme = useThemeStore((s) => s.theme);
  const set = useThemeStore((s) => s.setTheme);
  const applyPreset = useThemeStore((s) => s.applyPreset);
  const pr = useMemo(() => primaryRamp(theme.primary), [theme.primary]);
  const ar = useMemo(() => accentRamp(theme.accent), [theme.accent]);
  const adjusted = normalizeHex(pr[700]) !== normalizeHex(theme.primary) && contrast(theme.primary, "#ffffff") < 4.8;
  const accAdjusted = contrast(theme.accent, "#ffffff") < 3.1;

  return (
    <>
      <Group title="和の配色プリセット" hint={theme.presetId === "custom" ? "カスタム配色" : undefined}>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p, i) => {
            const on = theme.presetId === p.id;
            const v = p.values;
            const sideBg = v.sidebar === "light" ? v.surface : v.sidebar === "sumi" ? "#1d1c1a" : v.sidebar === "brand" ? v.primary : primaryRamp(v.primary)[900];
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                onClick={() => applyPreset(p.id)}
                className={cn("overflow-hidden rounded-lg border text-left transition-shadow", on ? "border-ai-500 ring-2 ring-ai-500/20" : "border-stone-200 hover:shadow-md")}
              >
                <div className="flex h-14" style={{ background: v.background }}>
                  <div className="w-5" style={{ background: sideBg, borderRight: v.sidebar === "light" ? "1px solid #e7e5e4" : undefined }} />
                  <div className="flex flex-1 flex-col justify-center gap-1.5 px-2">
                    <div className="h-2.5 w-3/4 rounded-sm" style={{ background: v.surface, boxShadow: "0 0 0 1px rgba(0,0,0,0.05)" }} />
                    <div className="flex items-center gap-1">
                      <span className="h-3 w-8 rounded-sm" style={{ background: v.primary }} />
                      <span className="h-3 w-5 rounded-sm" style={{ background: v.accent }} />
                      <span className="ml-auto h-3 w-3 rounded-full border" style={{ borderColor: v.seal }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <span>
                    <span className="font-mincho block text-[0.8125rem] font-bold text-stone-800">{p.name}</span>
                    <span className="block text-[0.5625rem] text-stone-500">{p.description}</span>
                  </span>
                  {on && <Check size={14} className="shrink-0 text-ai-600" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </Group>

      <Group title="色を個別に調整" hint="クリックで色を選択／16進数でも入力可">
        <div className="space-y-2">
          <ColorField label="メインカラー" note={adjusted ? "白文字が読みやすいよう明度を自動調整しています" : "ボタン・見出し・選択中の項目"} value={theme.primary} onChange={(v) => set({ primary: v })} ramp={pr} />
          <ColorField label="アクセントカラー" note={accAdjusted ? "白文字が読みやすいよう明度を自動調整しています" : "強調ボタン・現在地・注意喚起"} value={theme.accent} onChange={(v) => set({ accent: v })} ramp={ar} />
          <ColorField label="画面の背景色" value={theme.background} onChange={(v) => set({ background: v })} />
          <ColorField label="カード・入力欄の色" value={theme.surface} onChange={(v) => set({ surface: v })} />
          <ColorField label="印鑑・社印の色" value={theme.seal} onChange={(v) => set({ seal: v })} />
        </div>
      </Group>

      <Group title="灰色（文字・罫線）のトーン">
        <Chips cols={2} value={theme.neutral} onChange={(v) => set({ neutral: v })} options={NEUTRAL_TONES.map((n) => ({ value: n.key, label: n.label, note: n.note }))} />
      </Group>

      <Group title="サイドメニューの色">
        <Chips cols={2} value={theme.sidebar} onChange={(v) => set({ sidebar: v })} options={SIDEBAR_STYLES.map((s) => ({ value: s.key, label: s.label }))} />
      </Group>
    </>
  );
}

function FontOption({ fontKey, label, note, family, on, onClick }: { fontKey: string; label: string; note: string; family: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} data-font={fontKey} className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all", on ? "border-ai-500 bg-ai-50 ring-2 ring-ai-500/15" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50")}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] text-stone-800" style={{ fontFamily: family }}>
          {label}　<span className="text-stone-500">案件 K26-118 ¥12,345,000</span>
        </span>
        <span className="block text-[0.625rem] text-stone-500">{note}</span>
      </span>
      {on && <Check size={15} className="shrink-0 text-ai-600" />}
    </button>
  );
}

function FontSection() {
  const theme = useThemeStore((s) => s.theme);
  const set = useThemeStore((s) => s.setTheme);
  const sans = FONTS.filter((f) => f.kind === "sans");
  const serif = FONTS.filter((f) => f.kind === "serif");
  const mono = FONTS.filter((f) => f.kind === "mono");
  const bodyFamily = FONTS.find((f) => f.key === theme.fontBody)?.family ?? FONTS[0].family;
  return (
    <>
      <p className="rounded-md bg-stone-50 px-3 py-2 text-[0.6875rem] leading-relaxed text-stone-600">「同梱」と「システム」のフォントはオフラインでも利用できます。その他は Google Fonts から必要な文字だけを自動で読み込みます。</p>
      <Group title="本文フォント">
        <div className="space-y-1.5">
          {sans.map((f) => (
            <FontOption key={f.key} fontKey={f.key} label={f.label} note={f.note} family={f.family} on={theme.fontBody === f.key} onClick={() => set({ fontBody: f.key })} />
          ))}
        </div>
      </Group>
      <Group title="見出しフォント" hint="ページ名・カード見出し">
        <div className="space-y-1.5">
          <FontOption fontKey="body" label="本文と同じ" note="統一感のある標準設定" family={bodyFamily} on={theme.fontHeading === "body"} onClick={() => set({ fontHeading: "body" })} />
          {[...sans, ...serif].filter((f) => f.key !== theme.fontBody).map((f) => (
            <FontOption key={f.key} fontKey={f.key} label={f.label} note={f.note} family={f.family} on={theme.fontHeading === f.key} onClick={() => set({ fontHeading: f.key })} />
          ))}
        </div>
      </Group>
      <Group title="装飾・帳票フォント" hint="ロゴ・見積書・仕様書">
        <div className="space-y-1.5">
          {serif.map((f) => (
            <FontOption key={f.key} fontKey={f.key} label={f.label} note={f.note} family={f.family} on={theme.fontDecor === f.key} onClick={() => set({ fontDecor: f.key })} />
          ))}
          <FontOption fontKey="body" label="本文と同じ（ゴシック）" note="明朝を使わない場合" family={bodyFamily} on={theme.fontDecor === "body"} onClick={() => set({ fontDecor: "body" })} />
        </div>
      </Group>
      <Group title="数字フォント" hint="金額・番号・日付">
        <div className="space-y-1.5">
          <FontOption fontKey="body" label="本文と同じ" note="桁は自動でそろえます" family={bodyFamily} on={theme.fontNum === "body"} onClick={() => set({ fontNum: "body" })} />
          {mono.map((f) => (
            <FontOption key={f.key} fontKey={f.key} label={f.label} note={f.note} family={f.family} on={theme.fontNum === f.key} onClick={() => set({ fontNum: f.key })} />
          ))}
        </div>
      </Group>
      <Group title="文字の大きさ" hint={`${Math.round(theme.fontScale * 100)}%`}>
        <Slider value={theme.fontScale} min={0.85} max={1.25} step={0.05} onChange={(v) => set({ fontScale: v })} labels={["小さめ", "標準", "大きめ"]} />
      </Group>
      <Group title="文字の間隔" hint={`${theme.tracking.toFixed(2)}em`}>
        <Slider value={theme.tracking} min={0} max={0.08} step={0.01} onChange={(v) => set({ tracking: v })} labels={["詰める", "標準", "広げる"]} />
      </Group>
    </>
  );
}

function Slider({ value, min, max, step, onChange, labels }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; labels: [string, string, string] }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-ai-700"
        style={{ background: `linear-gradient(to right, var(--color-ai-600) ${pct}%, var(--color-stone-200) ${pct}%)` }}
      />
      <div className="mt-1 flex justify-between text-[0.625rem] text-stone-500">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function ShapeSection() {
  const theme = useThemeStore((s) => s.theme);
  const set = useThemeStore((s) => s.setTheme);
  return (
    <>
      <Group title="角の丸み" hint={theme.radius === 0 ? "角形" : `${theme.radius.toFixed(2)}倍`}>
        <Slider value={theme.radius} min={0} max={2} step={0.25} onChange={(v) => set({ radius: v })} labels={["角形", "標準", "丸み"]} />
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-lg border border-stone-200 bg-surface px-3 py-2 text-xs shadow-[var(--shadow-card)]">カード</span>
          <span className="rounded-md bg-ai-700 px-3 py-1.5 text-xs text-white">ボタン</span>
          <span className="rounded-sm bg-shu-50 px-1.5 py-0.5 text-[0.6875rem] text-shu-700 ring-1 ring-shu-200">ラベル</span>
          <span className="rounded-md border border-stone-300 bg-surface px-2 py-1 text-xs text-stone-400">入力欄</span>
        </div>
      </Group>
      <Group title="影の強さ">
        <Chips
          cols={4}
          value={theme.shadow}
          onChange={(v) => set({ shadow: v })}
          options={[
            { value: "none", label: "なし" },
            { value: "soft", label: "控えめ" },
            { value: "standard", label: "標準" },
            { value: "strong", label: "くっきり" },
          ]}
        />
      </Group>
      <Group title="表示の密度" hint="余白・表の行間">
        <Chips
          value={theme.density}
          onChange={(v) => set({ density: v })}
          options={[
            { value: "compact", label: "コンパクト", note: "一覧を多く表示" },
            { value: "standard", label: "標準", note: "バランス重視" },
            { value: "comfortable", label: "ゆったり", note: "タッチ操作向き" },
          ]}
        />
      </Group>
      <Group title="背景の質感">
        <Chips
          cols={2}
          value={theme.texture}
          onChange={(v) => set({ texture: v })}
          options={[
            { value: "none", label: "なし", note: "すっきり無地" },
            { value: "washi", label: "和紙", note: "ほのかな紙の風合い" },
          ]}
        />
      </Group>
      <Group title="和柄" hint="サイドメニュー・起動画面・ダッシュボード">
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              ["seigaiha", "青海波"],
              ["shippo", "七宝"],
              ["ichimatsu", "市松"],
              ["none", "なし"],
            ] as const
          ).map(([k, label]) => {
            const on = theme.pattern === k;
            return (
              <button key={k} onClick={() => set({ pattern: k })} className={cn("overflow-hidden rounded-lg border text-center transition-all", on ? "border-ai-500 ring-2 ring-ai-500/20" : "border-stone-200 hover:border-stone-300")}>
                <div className="relative h-12 bg-sidebar">
                  {k !== "none" && <WaPattern variant={k} className="absolute inset-0 h-full w-full" id={`wa-opt-${k}`} size={10} />}
                </div>
                <div className={cn("py-1 text-[0.6875rem]", on ? "font-bold text-ai-800" : "text-stone-600")}>{label}</div>
              </button>
            );
          })}
        </div>
      </Group>
    </>
  );
}

function MotionSection() {
  const theme = useThemeStore((s) => s.theme);
  const set = useThemeStore((s) => s.setTheme);
  const seasons: Season[] = ["auto", "sakura", "momiji", "yuki", "hotaru", "none"];
  const now = resolveSeason("auto");
  return (
    <>
      <Group title="アニメーション">
        <Chips
          value={theme.motion}
          onChange={(v) => set({ motion: v })}
          options={[
            { value: "none", label: "なし", note: "動きを止める" },
            { value: "subtle", label: "控えめ", note: "切替時のみ" },
            { value: "full", label: "軽やか", note: "光沢・季節の演出" },
          ]}
        />
        <OsMotionToggle />
      </Group>
      <Group title="季節の演出" hint="ダッシュボード上部に表示">
        <div className="grid grid-cols-3 gap-1.5">
          {seasons.map((s) => {
            const on = theme.season === s;
            return (
              <button key={s} onClick={() => set({ season: s })} className={cn("rounded-lg border px-2 py-2 text-xs transition-all", on ? "border-ai-500 bg-ai-50 font-bold text-ai-800 ring-2 ring-ai-500/15" : "border-stone-200 text-stone-600 hover:bg-stone-50")}>
                {s === "auto" ? `自動（${SEASON_LABEL[now]}）` : SEASON_LABEL[s]}
              </button>
            );
          })}
        </div>
        <div className="relative mt-3 h-28 overflow-hidden rounded-lg bg-gradient-to-br from-ai-800 to-ai-950">
          <WaPattern className="absolute inset-0 h-full w-full opacity-40" id="wa-season-prev" fill="transparent" line="rgba(255,255,255,0.12)" />
          <SeasonalParticles count={10} height={112} />
          <div className="absolute bottom-2 left-3 text-[0.625rem] text-white/80">{theme.motion === "full" ? "プレビュー" : "「軽やか」のときに表示されます"}</div>
        </div>
      </Group>
      <Group title="動きの見本">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-sheen rounded-md bg-ai-700 px-4 py-2 text-xs font-medium text-white">光沢ボタン</button>
          <span className="lift inline-block rounded-lg border border-stone-200 bg-surface px-3 py-2 text-xs">浮き上がるカード</span>
          <span className="link-anim cursor-pointer text-xs text-ai-700">下線が伸びるリンク</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="bar-stripes h-full w-2/3 rounded-full bg-ai-600" />
        </div>
      </Group>
    </>
  );
}

function PanelFooter() {
  const theme = useThemeStore((s) => s.theme);
  const reset = useThemeStore((s) => s.reset);
  const importTheme = useThemeStore((s) => s.importTheme);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify({ app: "takumicho-theme", version: 1, theme }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "匠帳_表示デザイン.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("表示デザインを書き出しました", { description: "他のパソコンで「読込」すると同じ見た目にできます" });
  };
  return (
    <div className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/80 px-5 py-3">
      <button
        onClick={() => {
          reset();
          toast.success("表示デザインを初期設定に戻しました");
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-stone-600 transition-colors hover:bg-stone-200/60"
      >
        <RotateCcw size={13} />
        初期設定に戻す
      </button>
      <div className="ml-auto flex gap-1.5">
        <button onClick={exportTheme} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-50">
          <Download size={13} />
          書き出し
        </button>
        <button onClick={() => fileRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-50">
          <Upload size={13} />
          読込
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const data = JSON.parse(await f.text());
              const t = (data.theme ?? data) as Partial<Theme>;
              if (typeof t !== "object" || !t || !("primary" in t)) throw new Error("invalid");
              importTheme(t);
              toast.success("表示デザインを読み込みました");
            } catch {
              toast.error("ファイルの形式が正しくありません");
            }
          }}
        />
      </div>
    </div>
  );
}

function OsMotionToggle() {
  const followOs = useThemeStore((s) => s.theme.followOs);
  const set = useThemeStore((s) => s.setTheme);
  const [osReduce, setOsReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOsReduce(mq.matches);
    const on = () => setOsReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return (
    <div className="mt-2 rounded-lg border border-stone-200 px-3 py-2.5">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-xs font-medium text-stone-700">パソコンの「アニメーションを減らす」設定に従う</span>
          <span className="block text-[0.625rem] text-stone-500">{osReduce ? "このパソコンでは現在「減らす」設定が有効です" : "このパソコンでは「減らす」設定は無効です"}</span>
        </span>
        <Toggle checked={followOs} onChange={(v) => set({ followOs: v })} />
      </label>
      {osReduce && followOs && <p className="mt-1.5 text-[0.625rem] text-amber-700">パソコンの設定により、アニメーションを停止しています。</p>}
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-ai-600" : "bg-stone-300")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className={cn("absolute h-4 w-4 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")} />
    </button>
  );
}
