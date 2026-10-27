// ============================================================
// テーマ（デザイントークン）定義
// 色・フォント・角丸・影・密度・動きをすべて CSS 変数として一元管理します。
//   ai-*   … メインカラー（ボタン・見出し・選択状態）
//   shu-*  … アクセントカラー（強調ボタン・現在地・注意喚起）
//   stone-*… 無彩色（文字・罫線・背景の灰色）
//   kinari … 画面の背景色 ／ surface … カード・入力欄の面の色 ／ inshu … 印鑑・社印の色
// ============================================================
import { accentRamp, hexToOklch, neutralRamp, normalizeHex, primaryRamp, shiftLightness, STEPS, withAlpha } from "./color";

export type NeutralTone = "warm" | "cool" | "pure" | "tinted";
export type SidebarStyle = "deep" | "brand" | "sumi" | "light";
export type ShadowLevel = "none" | "soft" | "standard" | "strong";
export type Density = "compact" | "standard" | "comfortable";
export type Texture = "none" | "washi";
export type Pattern = "seigaiha" | "shippo" | "ichimatsu" | "none";
export type MotionLevel = "none" | "subtle" | "full";
export type Season = "auto" | "sakura" | "momiji" | "yuki" | "hotaru" | "none";

export interface Theme {
  presetId: string;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  seal: string;
  neutral: NeutralTone;
  sidebar: SidebarStyle;
  fontBody: string;
  fontHeading: string;
  fontDecor: string;
  fontNum: string;
  fontScale: number;
  tracking: number;
  radius: number;
  shadow: ShadowLevel;
  density: Density;
  texture: Texture;
  pattern: Pattern;
  motion: MotionLevel;
  followOs: boolean;
  season: Season;
}

export const DEFAULT_THEME: Theme = {
  presetId: "aizome",
  primary: "#1a4868",
  accent: "#eb6101",
  background: "#f6f4ee",
  surface: "#ffffff",
  seal: "#c8102e",
  neutral: "warm",
  sidebar: "deep",
  fontBody: "noto",
  fontHeading: "body",
  fontDecor: "shippori",
  fontNum: "body",
  fontScale: 1,
  tracking: 0.02,
  radius: 1,
  shadow: "standard",
  density: "standard",
  texture: "none",
  pattern: "seigaiha",
  motion: "full",
  followOs: false,
  season: "auto",
};

export interface Preset {
  id: string;
  name: string;
  kana: string;
  description: string;
  values: Pick<Theme, "primary" | "accent" | "background" | "surface" | "seal" | "neutral" | "sidebar" | "pattern">;
}

export const PRESETS: Preset[] = [
  { id: "aizome", name: "藍染", kana: "あいぞめ", description: "藍と朱の伝統配色（標準）", values: { primary: "#1a4868", accent: "#eb6101", background: "#f6f4ee", surface: "#ffffff", seal: "#c8102e", neutral: "warm", sidebar: "deep", pattern: "seigaiha" } },
  { id: "wakatake", name: "若竹", kana: "わかたけ", description: "深緑と山吹の落ち着いた配色", values: { primary: "#1f5c47", accent: "#d39a12", background: "#f3f5ef", surface: "#ffffff", seal: "#b7282e", neutral: "warm", sidebar: "deep", pattern: "shippo" } },
  { id: "edomurasaki", name: "江戸紫", kana: "えどむらさき", description: "高貴な紫に琥珀を添えて", values: { primary: "#4a3577", accent: "#c27a2c", background: "#f6f4f8", surface: "#ffffff", seal: "#b81f3c", neutral: "tinted", sidebar: "deep", pattern: "seigaiha" } },
  { id: "sumi", name: "墨と朱", kana: "すみとしゅ", description: "書道を思わせる凛とした白黒", values: { primary: "#2e2e30", accent: "#d23a1d", background: "#f3f2ef", surface: "#ffffff", seal: "#c8102e", neutral: "pure", sidebar: "sumi", pattern: "ichimatsu" } },
  { id: "sakura", name: "桜", kana: "さくら", description: "やわらかな桜色と臙脂", values: { primary: "#8b3a55", accent: "#df5f7f", background: "#fbf5f5", surface: "#ffffff", seal: "#b5193a", neutral: "warm", sidebar: "light", pattern: "seigaiha" } },
  { id: "konpeki", name: "紺碧", kana: "こんぺき", description: "明るく軽快なモダン配色", values: { primary: "#1d4f9c", accent: "#f08a1c", background: "#f4f6f9", surface: "#ffffff", seal: "#c8102e", neutral: "cool", sidebar: "light", pattern: "none" } },
  { id: "kakishibu", name: "柿渋", kana: "かきしぶ", description: "民芸を感じる柿渋と藍", values: { primary: "#6f4326", accent: "#2f6f8f", background: "#f7f3eb", surface: "#fffdf9", seal: "#a8202c", neutral: "warm", sidebar: "deep", pattern: "shippo" } },
  { id: "matcha", name: "抹茶", kana: "まっちゃ", description: "抹茶と弁柄の和モダン", values: { primary: "#4b6a2a", accent: "#b4513a", background: "#f5f5ed", surface: "#ffffff", seal: "#a5222e", neutral: "warm", sidebar: "brand", pattern: "ichimatsu" } },
];

export interface FontDef {
  key: string;
  label: string;
  note: string;
  family: string;
  google?: string;
  kind: "sans" | "serif" | "mono";
}

const SANS_FALLBACK = `"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic UI", "Meiryo", sans-serif`;
const SERIF_FALLBACK = `"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif`;

export const FONTS: FontDef[] = [
  { key: "noto", label: "Noto Sans JP", note: "標準・同梱（オフライン可）", family: `"Noto Sans JP Variable", ${SANS_FALLBACK}`, kind: "sans" },
  { key: "biz-gothic", label: "BIZ UDPゴシック", note: "UDフォント・読み間違えにくい", family: `"BIZ UDPGothic", ${SANS_FALLBACK}`, google: "BIZ+UDPGothic:wght@400;700", kind: "sans" },
  { key: "zen-kaku", label: "Zen角ゴシック New", note: "すっきり上品", family: `"Zen Kaku Gothic New", ${SANS_FALLBACK}`, google: "Zen+Kaku+Gothic+New:wght@400;500;700", kind: "sans" },
  { key: "mplus", label: "M PLUS 2", note: "モダンで軽やか", family: `"M PLUS 2", ${SANS_FALLBACK}`, google: "M+PLUS+2:wght@400;500;700", kind: "sans" },
  { key: "zen-maru", label: "Zen丸ゴシック", note: "丸みのある、やわらかな印象", family: `"Zen Maru Gothic", ${SANS_FALLBACK}`, google: "Zen+Maru+Gothic:wght@400;500;700", kind: "sans" },
  { key: "ibm-plex", label: "IBM Plex Sans JP", note: "硬質で技術的", family: `"IBM Plex Sans JP", ${SANS_FALLBACK}`, google: "IBM+Plex+Sans+JP:wght@400;500;700", kind: "sans" },
  { key: "sys-gothic", label: "システムゴシック", note: "游ゴシック・メイリオ等（読込不要）", family: `"Yu Gothic UI", "Yu Gothic", YuGothic, Meiryo, "Hiragino Sans", sans-serif`, kind: "sans" },
  { key: "shippori", label: "しっぽり明朝", note: "標準・同梱（オフライン可）", family: `"Shippori Mincho", ${SERIF_FALLBACK}`, kind: "serif" },
  { key: "noto-serif", label: "Noto Serif JP", note: "端正な明朝体", family: `"Noto Serif JP", ${SERIF_FALLBACK}`, google: "Noto+Serif+JP:wght@400;600;700", kind: "serif" },
  { key: "zen-old", label: "Zen Old Mincho", note: "古風で趣のある明朝", family: `"Zen Old Mincho", ${SERIF_FALLBACK}`, google: "Zen+Old+Mincho:wght@400;600;700", kind: "serif" },
  { key: "biz-mincho", label: "BIZ UDP明朝", note: "UD明朝・帳票向き", family: `"BIZ UDPMincho", ${SERIF_FALLBACK}`, google: "BIZ+UDPMincho:wght@400;700", kind: "serif" },
  { key: "sys-mincho", label: "システム明朝", note: "游明朝・ヒラギノ明朝（読込不要）", family: `"Yu Mincho", YuMincho, "Hiragino Mincho ProN", serif`, kind: "serif" },
  { key: "inter", label: "Inter", note: "欧文・数字が美しい", family: `"Inter", "Noto Sans JP Variable", sans-serif`, google: "Inter:wght@400;500;600;700", kind: "mono" },
  { key: "roboto-mono", label: "Roboto Mono", note: "等幅・桁がそろう", family: `"Roboto Mono", "Noto Sans JP Variable", monospace`, google: "Roboto+Mono:wght@400;500;700", kind: "mono" },
  { key: "biz-ud", label: "BIZ UDゴシック", note: "等幅のUDフォント", family: `"BIZ UDGothic", "Noto Sans JP Variable", monospace`, google: "BIZ+UDGothic:wght@400;700", kind: "mono" },
];

export const fontByKey = (k: string) => FONTS.find((f) => f.key === k);

export const SIDEBAR_STYLES: { key: SidebarStyle; label: string }[] = [
  { key: "deep", label: "濃色（メインカラー）" },
  { key: "brand", label: "メインカラー" },
  { key: "sumi", label: "墨色" },
  { key: "light", label: "淡色（白）" },
];

export const NEUTRAL_TONES: { key: NeutralTone; label: string; note: string }[] = [
  { key: "warm", label: "暖色", note: "生成り・和紙の温かみ" },
  { key: "cool", label: "寒色", note: "すっきり涼しげ" },
  { key: "pure", label: "無彩色", note: "色みのない灰色" },
  { key: "tinted", label: "メイン色寄り", note: "メインカラーをほんのり" },
];

export interface ThemeOutput {
  vars: Record<string, string>;
  attrs: Record<string, string>;
  fontUrl?: string;
  themeColor: string;
}

const same = (a: string, b: string) => normalizeHex(a) === normalizeHex(b);

/** テーマから CSS 変数・属性・読込フォントを算出 */
export function buildTheme(t: Theme): ThemeOutput {
  const vars: Record<string, string> = {};
  const primary = normalizeHex(t.primary) ?? DEFAULT_THEME.primary;
  const accent = normalizeHex(t.accent) ?? DEFAULT_THEME.accent;
  const bg = normalizeHex(t.background) ?? DEFAULT_THEME.background;
  const surface = normalizeHex(t.surface) ?? DEFAULT_THEME.surface;
  const seal = normalizeHex(t.seal) ?? DEFAULT_THEME.seal;

  // 色：既定値と同じ場合は CSS 側の調整済みの値をそのまま使う
  const pr = primaryRamp(primary);
  if (!same(primary, DEFAULT_THEME.primary)) STEPS.forEach((s) => (vars[`--color-ai-${s}`] = pr[s]));
  const ar = accentRamp(accent);
  if (!same(accent, DEFAULT_THEME.accent)) STEPS.forEach((s) => (vars[`--color-shu-${s}`] = ar[s]));
  if (t.neutral !== "warm") {
    const hue = t.neutral === "cool" ? 255 : t.neutral === "tinted" ? hexToOklch(primary).h : 0;
    const k = t.neutral === "cool" ? 1.6 : t.neutral === "tinted" ? 1.3 : 0;
    const nr = neutralRamp(hue, k);
    STEPS.forEach((s) => (vars[`--color-stone-${s}`] = nr[s]));
    vars["--color-sumi"] = shiftLightness(nr[900], -0.03);
  }
  vars["--color-kinari"] = bg;
  vars["--color-kinari-dark"] = shiftLightness(bg, -0.035, 0.004);
  vars["--color-surface"] = surface;
  vars["--color-inshu"] = seal;

  // サイドバー
  const p = same(primary, DEFAULT_THEME.primary) ? null : pr;
  const ref = (step: number) => (p ? p[step as 50] : `var(--color-ai-${step})`);
  const aref = (step: number) => `var(--color-shu-${step})`;
  let themeColor = p ? p[900] : "#132c40";
  if (t.sidebar === "deep") {
    Object.assign(vars, {
      "--color-sidebar": ref(900),
      "--color-sidebar-pattern": ref(900),
      "--color-sidebar-pattern-line": "rgba(255,255,255,0.09)",
      "--color-sidebar-fg": "#ffffff",
      "--color-sidebar-muted": ref(200),
      "--color-sidebar-subtle": ref(400),
      "--color-sidebar-hover": "rgba(255,255,255,0.06)",
      "--color-sidebar-active": "rgba(255,255,255,0.12)",
      "--color-sidebar-active-fg": "#ffffff",
      "--color-sidebar-icon": aref(300),
      "--color-sidebar-border": "rgba(255,255,255,0.1)",
    });
  } else if (t.sidebar === "brand") {
    themeColor = p ? p[700] : "#1a4868";
    Object.assign(vars, {
      "--color-sidebar": ref(700),
      "--color-sidebar-pattern": ref(700),
      "--color-sidebar-pattern-line": "rgba(255,255,255,0.1)",
      "--color-sidebar-fg": "#ffffff",
      "--color-sidebar-muted": ref(100),
      "--color-sidebar-subtle": ref(300),
      "--color-sidebar-hover": "rgba(255,255,255,0.08)",
      "--color-sidebar-active": "rgba(255,255,255,0.16)",
      "--color-sidebar-active-fg": "#ffffff",
      "--color-sidebar-icon": aref(200),
      "--color-sidebar-border": "rgba(255,255,255,0.14)",
    });
  } else if (t.sidebar === "sumi") {
    themeColor = "#1d1c1a";
    Object.assign(vars, {
      "--color-sidebar": "#1d1c1a",
      "--color-sidebar-pattern": "#1d1c1a",
      "--color-sidebar-pattern-line": "rgba(255,255,255,0.07)",
      "--color-sidebar-fg": "#ffffff",
      "--color-sidebar-muted": "#d6d3d1",
      "--color-sidebar-subtle": "#8a8580",
      "--color-sidebar-hover": "rgba(255,255,255,0.06)",
      "--color-sidebar-active": "rgba(255,255,255,0.11)",
      "--color-sidebar-active-fg": "#ffffff",
      "--color-sidebar-icon": aref(400),
      "--color-sidebar-border": "rgba(255,255,255,0.09)",
    });
  } else {
    themeColor = surface;
    Object.assign(vars, {
      "--color-sidebar": surface,
      "--color-sidebar-pattern": surface,
      "--color-sidebar-pattern-line": withAlpha(pr[700], 0.07),
      "--color-sidebar-fg": "var(--color-stone-800)",
      "--color-sidebar-muted": "var(--color-stone-600)",
      "--color-sidebar-subtle": "var(--color-stone-400)",
      "--color-sidebar-hover": withAlpha(pr[700], 0.05),
      "--color-sidebar-active": withAlpha(pr[700], 0.09),
      "--color-sidebar-active-fg": ref(800),
      "--color-sidebar-icon": ref(600),
      "--color-sidebar-border": "var(--color-stone-200)",
    });
  }

  // フォント
  const body = fontByKey(t.fontBody) ?? FONTS[0];
  const heading = t.fontHeading === "body" ? body : fontByKey(t.fontHeading) ?? body;
  const decor = t.fontDecor === "body" ? body : fontByKey(t.fontDecor) ?? FONTS.find((f) => f.key === "shippori")!;
  const numf = t.fontNum === "body" ? body : fontByKey(t.fontNum) ?? body;
  vars["--font-sans"] = body.family;
  vars["--font-heading"] = heading.family;
  vars["--font-mincho"] = decor.family;
  vars["--font-num"] = numf.family;
  vars["--font-scale"] = String(Math.min(1.3, Math.max(0.8, t.fontScale)));
  vars["--tracking-body"] = `${t.tracking}em`;
  const families = Array.from(new Set([body, heading, decor, numf].map((f) => f.google).filter(Boolean)));
  const fontUrl = families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap` : undefined;

  // 形・密度
  const r = Math.max(0, Math.min(2.5, t.radius));
  Object.assign(vars, {
    "--radius-xs": `${0.125 * r}rem`,
    "--radius-sm": `${0.25 * r}rem`,
    "--radius-md": `${0.375 * r}rem`,
    "--radius-lg": `${0.5 * r}rem`,
    "--radius-xl": `${0.75 * r}rem`,
    "--radius-2xl": `${1 * r}rem`,
  });
  const sh = p ? p[950] : "#0c1c2a";
  const shadow = {
    none: ["0 0 0 0 transparent", `0 0 0 1px ${withAlpha(sh, 0.08)}`],
    soft: [`0 1px 2px ${withAlpha(sh, 0.03)}`, `0 3px 10px ${withAlpha(sh, 0.06)}`],
    standard: [`0 1px 2px ${withAlpha(sh, 0.04)}, 0 1px 3px ${withAlpha(sh, 0.06)}`, `0 4px 12px ${withAlpha(sh, 0.08)}, 0 2px 4px ${withAlpha(sh, 0.06)}`],
    strong: [`0 2px 4px ${withAlpha(sh, 0.06)}, 0 4px 12px ${withAlpha(sh, 0.08)}`, `0 10px 28px ${withAlpha(sh, 0.14)}, 0 4px 8px ${withAlpha(sh, 0.08)}`],
  }[t.shadow];
  vars["--shadow-card"] = shadow[0];
  vars["--shadow-lift"] = shadow[1];
  const dens = { compact: ["0.225rem", "6px", "10px"], standard: ["0.25rem", "9px", "12px"], comfortable: ["0.275rem", "12px", "14px"] }[t.density];
  vars["--spacing"] = dens[0];
  vars["--tbl-py"] = dens[1];
  vars["--tbl-px"] = dens[2];

  return {
    vars,
    attrs: { "data-motion": t.motion, "data-follow-os": String(!!t.followOs), "data-texture": t.texture, "data-density": t.density, "data-sidebar": t.sidebar },
    fontUrl,
    themeColor,
  };
}

export function resolveSeason(s: Season, date = new Date()): Exclude<Season, "auto"> {
  if (s !== "auto") return s;
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "sakura";
  if (m >= 6 && m <= 8) return "hotaru";
  if (m >= 9 && m <= 11) return "momiji";
  return "yuki";
}

export const BOOT_KEY = "takumicho-theme-boot";

/** 初回描画前に保存済みテーマを適用するインラインスクリプト（ちらつき防止） */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=JSON.parse(localStorage.getItem("${BOOT_KEY}")||"null");if(!d)return;var r=document.documentElement;for(var k in d.v)r.style.setProperty(k,d.v[k]);for(var a in d.a)r.setAttribute(a,d.a[a]);if(d.f){var l=document.createElement("link");l.rel="stylesheet";l.href=d.f;l.id="theme-font-link";document.head.appendChild(l);}var m=document.querySelector('meta[name="theme-color"]');if(m&&d.c)m.setAttribute("content",d.c);}catch(e){}})();`;
