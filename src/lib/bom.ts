import type { BomItem, BomTemplate, BomTemplateItem, Part, Procurement } from "./types";
import { uid } from "./format";

/** テンプレート（標準モジュール）を BOM 行に展開 */
export function instantiateTemplate(
  tpl: Pick<BomTemplate, "items">,
  startSort: number,
  parentId: string | null = null,
  idFn: () => string = () => uid("bom"),
): BomItem[] {
  const keyToId = new Map<string, string>();
  tpl.items.forEach((it) => keyToId.set(it.key, idFn()));
  return tpl.items.map((it, idx) => ({
    id: keyToId.get(it.key)!,
    parentId: it.parentKey ? keyToId.get(it.parentKey) ?? null : parentId,
    partNo: it.partNo,
    name: it.name,
    spec: it.spec,
    material: it.material,
    maker: it.maker,
    qty: it.qty,
    unit: it.unit,
    unitCost: it.unitCost,
    procurement: it.procurement,
    supplierId: it.supplierId,
    leadTimeDays: it.leadTimeDays,
    note: "",
    sortOrder: it.parentKey ? idx : startSort + idx,
  }));
}

/** 既存 BOM のサブツリーを新しい ID で複製（類似案件からの流用） */
export function cloneSubtrees(source: BomItem[], rootIds: string[], startSort: number, parentId: string | null = null) {
  const result: BomItem[] = [];
  const idMap = new Map<string, string>();
  const walk = (item: BomItem, newParent: string | null, sort: number) => {
    const nid = uid("bom");
    idMap.set(item.id, nid);
    result.push({ ...item, id: nid, parentId: newParent, poId: undefined, sortOrder: sort, note: item.note });
    source
      .filter((c) => c.parentId === item.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c, i) => walk(c, nid, i));
  };
  rootIds.forEach((rid, i) => {
    const item = source.find((s) => s.id === rid);
    if (item) walk(item, parentId, startSort + i);
  });
  return result;
}

/** BOM サブツリーをテンプレート形式に変換 */
export function subtreeToTemplateItems(source: BomItem[], rootId: string): BomTemplateItem[] {
  const out: BomTemplateItem[] = [];
  const walk = (item: BomItem, parentKey: string | null) => {
    const key = `k${out.length}`;
    out.push({
      key,
      parentKey,
      partNo: item.partNo,
      name: item.name,
      spec: item.spec,
      material: item.material,
      maker: item.maker,
      qty: item.qty,
      unit: item.unit,
      unitCost: item.unitCost,
      procurement: item.procurement,
      supplierId: item.supplierId,
      leadTimeDays: item.leadTimeDays,
    });
    source
      .filter((c) => c.parentId === item.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => walk(c, key));
  };
  const root = source.find((s) => s.id === rootId);
  if (root) walk(root, null);
  return out;
}

export interface ParsedBomRow {
  partNo: string;
  name: string;
  spec: string;
  maker: string;
  qty: number;
  unit: string;
  unitCost: number;
  procurement: Procurement;
  matchedPart?: Part;
  error?: string;
}

const toNumber = (s: string | undefined) => {
  if (!s) return NaN;
  const n = Number(
    s
      .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[,¥￥円\s]/g, ""),
  );
  return n;
};

/**
 * Excel からのコピー＆ペースト（タブ区切り）または CSV を解析
 * 列：品番, 品名, 型式・仕様, メーカー, 数量, 単位, 単価
 * 品番が品目マスタに存在する場合は、空欄の項目をマスタで補完する
 */
export function parseBomText(text: string, parts: Part[]): ParsedBomRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  const rows: ParsedBomRow[] = [];
  lines.forEach((line, idx) => {
    const cols = (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim().replace(/^"|"$/g, ""));
    // 見出し行はスキップ
    if (idx === 0 && /品番|品名|部品/.test(cols.join(""))) return;
    const [partNo = "", name = "", spec = "", maker = "", qtyS = "", unit = "", costS = ""] = cols;
    const matched = parts.find((p) => p.partNo.toLowerCase() === partNo.toLowerCase() && partNo !== "");
    const qty = toNumber(qtyS);
    const cost = toNumber(costS);
    const row: ParsedBomRow = {
      partNo: partNo || matched?.partNo || "",
      name: name || matched?.name || "",
      spec: spec || matched?.spec || "",
      maker: maker || matched?.maker || "",
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unit: unit || matched?.unit || "個",
      unitCost: Number.isFinite(cost) ? cost : matched?.standardCost ?? 0,
      procurement: matched?.procurement ?? "buy",
      matchedPart: matched,
    };
    if (!row.name) row.error = "品名がありません";
    rows.push(row);
  });
  return rows;
}
