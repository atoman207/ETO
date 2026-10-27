// ============================================================
// 色計算ユーティリティ（OKLCH 色空間）
// 1色からトーンの段階（50〜950）を自動生成し、文字の読みやすさ（コントラスト）を保証します
// ============================================================

export type Step = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export const STEPS: Step[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

interface Oklch {
  l: number;
  c: number;
  h: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function normalizeHex(hex: string): string | null {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toLowerCase()}` : null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (normalizeHex(hex) ?? "#000000").slice(1);
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const to = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m_ = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s_ = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: [number, number, number]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** 表示可能な範囲（sRGB）に収まるよう彩度を落として変換 */
export function oklchToHex(color: Oklch): string {
  const col = { ...color, l: clamp01(color.l) };
  let lin = oklchToLinear(col);
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = col.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...col, c: mid }))) lo = mid;
      else hi = mid;
    }
    lin = oklchToLinear({ ...col, c: lo });
  }
  return rgbToHex(lin.map((v) => toGamma(clamp01(v))) as [number, number, number]);
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 白文字とのコントラストが基準を満たすまで明度を下げる */
export function ensureContrastWithWhite(hex: string, min: number) {
  const c = hexToOklch(hex);
  let out = oklchToHex(c);
  for (let i = 0; i < 40 && contrast(out, "#ffffff") < min; i++) {
    c.l -= 0.01;
    out = oklchToHex(c);
  }
  return out;
}

export function shiftLightness(hex: string, dl: number, dc = 0) {
  const c = hexToOklch(hex);
  return oklchToHex({ l: c.l + dl, c: Math.max(0, c.c + dc), h: c.h });
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

// 基準色をどの段階に置くかによって、明るい側・暗い側の伸ばし方を変える
const LIGHT_FACTOR: Partial<Record<Step, number>> = { 50: 1, 100: 0.92, 200: 0.78, 300: 0.61, 400: 0.42, 500: 0.24, 600: 0.1 };
const DARK_FACTOR: Partial<Record<Step, number>> = { 800: 0.24, 900: 0.48, 950: 0.81 };
const CHROMA_FACTOR: Record<Step, number> = { 50: 0.12, 100: 0.28, 200: 0.5, 300: 0.75, 400: 0.95, 500: 1.05, 600: 1.02, 700: 1, 800: 0.9, 900: 0.78, 950: 0.62 };

/**
 * メインカラー用：基準色を 700（ボタン・見出しに使う濃さ）に置いて 50〜950 を生成
 */
export function primaryRamp(base: string): Record<Step, string> {
  const b = hexToOklch(ensureContrastWithWhite(base, 4.8));
  const out = {} as Record<Step, string>;
  STEPS.forEach((s) => {
    let l = b.l;
    if (s < 700) l = b.l + (0.972 - b.l) * (LIGHT_FACTOR[s] ?? 0);
    if (s > 700) l = b.l - (b.l - 0.17) * (DARK_FACTOR[s] ?? 0);
    out[s] = oklchToHex({ l, c: b.c * CHROMA_FACTOR[s], h: b.h });
  });
  return out;
}

const ACCENT_LIGHT: Partial<Record<Step, number>> = { 50: 1, 100: 0.875, 200: 0.64, 300: 0.39, 400: 0.17 };
const ACCENT_DARK: Partial<Record<Step, number>> = { 600: 0.2, 700: 0.41, 800: 0.55, 900: 0.7, 950: 0.82 };
const ACCENT_CHROMA: Record<Step, number> = { 50: 0.15, 100: 0.3, 200: 0.55, 300: 0.8, 400: 0.95, 500: 1, 600: 0.95, 700: 0.85, 800: 0.75, 900: 0.65, 950: 0.55 };

/**
 * アクセントカラー用：基準色を 500（強調ボタン）に置いて生成
 */
export function accentRamp(base: string): Record<Step, string> {
  const b = hexToOklch(ensureContrastWithWhite(base, 3.1));
  const out = {} as Record<Step, string>;
  STEPS.forEach((s) => {
    let l = b.l;
    if (s < 500) l = b.l + (0.976 - b.l) * (ACCENT_LIGHT[s] ?? 0);
    if (s > 500) l = b.l - (b.l - 0.22) * (ACCENT_DARK[s] ?? 0);
    out[s] = oklchToHex({ l, c: b.c * ACCENT_CHROMA[s], h: b.h });
  });
  return out;
}

const NEUTRAL_L: Record<Step, number> = { 50: 0.985, 100: 0.97, 200: 0.923, 300: 0.869, 400: 0.709, 500: 0.553, 600: 0.444, 700: 0.374, 800: 0.268, 900: 0.216, 950: 0.147 };
const NEUTRAL_C: Record<Step, number> = { 50: 0.002, 100: 0.004, 200: 0.007, 300: 0.01, 400: 0.016, 500: 0.019, 600: 0.019, 700: 0.018, 800: 0.014, 900: 0.012, 950: 0.009 };

/** 無彩色（文字・罫線・背景の灰色）を色相 hue・彩度倍率 k で生成 */
export function neutralRamp(hue: number, k: number): Record<Step, string> {
  const out = {} as Record<Step, string>;
  STEPS.forEach((s) => (out[s] = oklchToHex({ l: NEUTRAL_L[s], c: NEUTRAL_C[s] * k, h: hue })));
  return out;
}
