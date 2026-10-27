import type { BomItem, CostBreakdown, Quote, Spec } from "./types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

let idCounter = 0;
export function uid(prefix = "id") {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const yenFmt = new Intl.NumberFormat("ja-JP");

export function yen(n: number | undefined | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `¥${yenFmt.format(Math.round(n))}`;
}

export function num(n: number | undefined | null, digits = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

/** 金額を「万円」「億円」単位で表示 */
export function manYen(n: number | undefined | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 100_000_000) {
    return `${num(n / 100_000_000, 2)}億円`;
  }
  return `${num(n / 10_000, Math.abs(n) < 1_000_000 ? 1 : 0)}万円`;
}

export function pct(n: number | undefined | null, digits = 1) {
  if (n === undefined || n === null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function toDate(s: string | Date) {
  return typeof s === "string" ? new Date(s.length <= 10 ? `${s}T00:00:00` : s) : s;
}

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today() {
  return ymd(new Date());
}

export function nowIso() {
  return new Date().toISOString();
}

/** 2026/10/27（火） */
export function fmtDate(s?: string, withWeekday = true) {
  if (!s) return "—";
  const d = toDate(s);
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  return withWeekday ? `${base}（${WEEKDAYS[d.getDay()]}）` : base;
}

/** 2026年10月27日 */
export function fmtDateJa(s?: string) {
  if (!s) return "—";
  const d = toDate(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 令和8年10月27日 */
export function fmtWareki(s?: string) {
  if (!s) return "—";
  const d = toDate(s);
  const y = d.getFullYear() - 2018;
  return `令和${y === 1 ? "元" : y}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function fmtDateTime(s?: string) {
  if (!s) return "—";
  const d = toDate(s);
  return `${fmtDate(ymd(d), false)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relTime(s: string) {
  const d = toDate(s).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}ヶ月前`;
  return `${Math.floor(mon / 12)}年前`;
}

export function addDays(s: string, days: number) {
  const d = toDate(s);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function diffDays(a: string, b: string) {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86400000);
}

export function daysFromToday(s?: string) {
  if (!s) return undefined;
  return diffDays(s, today());
}

export function yy(s: string) {
  return String(toDate(s).getFullYear()).slice(2);
}

export function costTotal(c?: CostBreakdown) {
  if (!c) return 0;
  return c.design + c.material + c.purchased + c.machining + c.assembly + c.testing + c.transport + c.overhead;
}

export function quoteSubtotal(q: Pick<Quote, "items" | "discount">) {
  return q.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) - (q.discount || 0);
}

export function quoteCost(q: Pick<Quote, "items">) {
  return q.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
}

export function specSummary(s: Spec, unit?: string) {
  const parts: string[] = [];
  if (s.capacity) parts.push(`${num(s.capacity)}${unit ?? s.capacityUnit}`);
  if (s.width && s.depth && s.height) parts.push(`W${num(s.width)}×D${num(s.depth)}×H${num(s.height)}`);
  if (s.material) parts.push(s.material);
  return parts.join(" / ");
}

/** BOM ツリー：子を持つ行は子の合計を原価とする */
export function bomChildren(items: BomItem[], parentId: string | null) {
  return items.filter((i) => i.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function bomRollup(items: BomItem[], id: string): number {
  const children = items.filter((i) => i.parentId === id);
  const self = items.find((i) => i.id === id);
  if (!self) return 0;
  if (children.length === 0) return self.unitCost * self.qty;
  return children.reduce((s, c) => s + bomRollup(items, c.id), 0) * self.qty;
}

export function bomTotal(items: BomItem[]) {
  return bomChildren(items, null).reduce((s, i) => s + bomRollup(items, i.id), 0);
}

export function bomLeafCount(items: BomItem[]) {
  const parents = new Set(items.map((i) => i.parentId).filter(Boolean));
  return items.filter((i) => !parents.has(i.id)).length;
}

export function bomDescendants(items: BomItem[], id: string): string[] {
  const result: string[] = [];
  const walk = (pid: string) => {
    items
      .filter((i) => i.parentId === pid)
      .forEach((c) => {
        result.push(c.id);
        walk(c.id);
      });
  };
  walk(id);
  return result;
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name.replace(/\s+/g, "").slice(0, 1);
}

export function surname(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

/** 全角英数を半角に、カタカナ・ひらがなを統一して検索用に正規化 */
export function normalize(s: string) {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}

export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((f) => f && normalize(f).includes(q));
}
