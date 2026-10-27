import type { Case, Customer, EquipmentType, Spec } from "./types";

export interface SimilarityQuery {
  equipmentType?: EquipmentType;
  specs: Partial<Spec>;
  industry?: string;
  keyword?: string;
}

export interface SimilarityResult {
  score: number; // 0〜100
  reasons: string[];
}

const closeness = (a?: number, b?: number) => {
  if (!a || !b) return 0;
  return Math.max(0, 1 - Math.abs(a - b) / Math.max(a, b));
};

/** 仕様パラメータの重み付き類似度 */
export function similarity(q: SimilarityQuery, c: Case, customer?: Customer): SimilarityResult {
  const reasons: string[] = [];
  let score = 0;
  let weight = 0;

  const add = (w: number, v: number, reason?: string) => {
    weight += w;
    score += w * v;
    if (reason && v >= 0.7) reasons.push(reason);
  };

  if (q.equipmentType) add(30, q.equipmentType === c.equipmentType ? 1 : 0, "装置種別が一致");
  if (q.specs.capacity) {
    const v = q.equipmentType === c.equipmentType || !q.equipmentType ? closeness(q.specs.capacity, c.specs.capacity) : 0;
    add(20, v, "処理能力が近い");
  }
  if (q.specs.width || q.specs.depth || q.specs.height) {
    const v = (closeness(q.specs.width, c.specs.width) + closeness(q.specs.depth, c.specs.depth) + closeness(q.specs.height, c.specs.height)) / 3;
    add(10, v, "外形寸法が近い");
  }
  if (q.specs.material) add(10, q.specs.material === c.specs.material ? 1 : c.specs.material.includes(q.specs.material.slice(0, 3)) ? 0.5 : 0, "材質が一致");
  if (q.specs.environment) add(10, q.specs.environment === c.specs.environment ? 1 : 0, "設置環境が一致");
  if (q.specs.control) add(5, q.specs.control === c.specs.control ? 1 : q.specs.control.slice(0, 7) === c.specs.control.slice(0, 7) ? 0.6 : 0, "制御方式が一致");
  if (q.industry) add(10, customer?.industry === q.industry ? 1 : 0, "顧客業種が一致");
  if (q.specs.options && q.specs.options.length) {
    const a = new Set(q.specs.options);
    const b = new Set(c.specs.options);
    const inter = [...a].filter((x) => b.has(x)).length;
    const union = new Set([...a, ...b]).size || 1;
    add(5, inter / union, "オプション構成が近い");
  }
  if (q.keyword) {
    const k = q.keyword.toLowerCase();
    const text = [c.title, c.description, c.specs.workpiece, c.tags.join(" "), ...c.specs.customFields.map((f) => f.value)].join(" ").toLowerCase();
    add(15, text.includes(k) ? 1 : 0, `「${q.keyword}」を含む`);
  }

  return { score: weight ? Math.round((score / weight) * 100) : 0, reasons };
}
