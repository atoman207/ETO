"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, GitCompare, RotateCcw, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, costTotal, diffDays, manYen, num, pct, yen } from "@/lib/format";
import { COST_COLORS, COST_KEYS, COST_LABELS, CONTROLS, ENVIRONMENTS, EQUIPMENT_TYPES, EQUIPMENT_TYPE_KEYS, INDUSTRIES, MATERIALS, OPTION_PRESETS } from "@/lib/constants";
import { similarity, type SimilarityQuery } from "@/lib/similarity";
import type { Case, EquipmentType } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NumberInput, Select } from "@/components/ui/form";
import { Badge, StageBadge } from "@/components/ui/badge";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}

interface Criteria {
  type: EquipmentType | "";
  capacity: number;
  width: number;
  depth: number;
  height: number;
  material: string;
  environment: string;
  control: string;
  industry: string;
  keyword: string;
  options: string[];
  includeLost: boolean;
}

const EMPTY: Criteria = { type: "", capacity: 0, width: 0, depth: 0, height: 0, material: "", environment: "", control: "", industry: "", keyword: "", options: [], includeLost: false };

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const cases = useStore((s) => s.cases);
  const services = useStore((s) => s.services);
  const equipment = useStore((s) => s.equipment);
  const canCost = useCan("viewCost");
  const canEdit = useCan("editCase");
  const lk = useLookups();
  const [cr, setCr] = useState<Criteria>({ ...EMPTY, type: "washer", capacity: 700 });
  const [baseId, setBaseId] = useState<string | undefined>();
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    const cid = params.get("case");
    if (!cid) return;
    const c = useStore.getState().cases.find((x) => x.id === cid);
    if (!c) return;
    const cust = useStore.getState().customers.find((x) => x.id === c.customerId);
    setBaseId(c.id);
    setCr({ type: c.equipmentType, capacity: c.specs.capacity, width: c.specs.width, depth: c.specs.depth, height: c.specs.height, material: c.specs.material, environment: c.specs.environment, control: c.specs.control, industry: cust?.industry ?? "", keyword: "", options: [...c.specs.options], includeLost: false });
    setCompare([]);
  }, [params]);

  const base = baseId ? lk.case.get(baseId) : undefined;

  const results = useMemo(() => {
    const q: SimilarityQuery = {
      equipmentType: cr.type || undefined,
      specs: { capacity: cr.capacity || undefined, width: cr.width || undefined, depth: cr.depth || undefined, height: cr.height || undefined, material: cr.material || undefined, environment: cr.environment || undefined, control: cr.control || undefined, options: cr.options },
      industry: cr.industry || undefined,
      keyword: cr.keyword.trim() || undefined,
    };
    return cases
      .filter((c) => c.id !== baseId && (c.order || (cr.includeLost && c.status === "lost")))
      .map((c) => ({ c, ...similarity(q, c, lk.customer.get(c.customerId)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [cases, cr, baseId, lk]);

  const toggle = (id: string) => setCompare((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setCr((p) => ({ ...p, [k]: v }));

  const info = (c: Case) => {
    const price = c.order?.orderAmount ?? c.expectedAmount;
    const cost = c.actualCost ?? c.costEstimate;
    const eqIds = equipment.filter((e) => e.caseId === c.id).map((e) => e.id);
    const svc = services.filter((s) => eqIds.includes(s.equipmentId));
    return {
      price,
      cost,
      costTotal: costTotal(cost),
      margin: price ? 1 - costTotal(cost) / price : 0,
      lead: c.order ? diffDays(c.shipment.deliveredDate ?? c.order.deliveryDate, c.order.orderDate) : undefined,
      svc: svc.length,
      repairs: svc.filter((s) => s.type === "repair").length,
      perCap: c.specs.capacity ? price / c.specs.capacity : 0,
    };
  };

  return (
    <div>
      <PageHeader
        title="類似案件検索・原価比較"
        description="仕様パラメータから過去の納入実績を類似度順に検索し、金額・原価・リードタイム・故障実績を比較できます"
        icon={<GitCompare size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "類似案件・原価比較" }]}
      />
      {base && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ai-200 bg-ai-50 px-4 py-2.5 text-[13px] text-ai-900">
          <span>
            <span className="font-num font-bold">{base.workNo ?? base.dealNo}</span>「{base.title}」の仕様で検索しています
          </span>
          <div className="flex gap-2">
            <Link href={`/cases/${base.id}`}><Button size="sm" icon={<ExternalLink size={13} />}>案件に戻る</Button></Link>
            <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => { setBaseId(undefined); router.replace("/search"); }}>解除</Button>
          </div>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card className="self-start xl:sticky xl:top-20">
          <CardHeader title="検索条件" icon={<Search size={16} />} actions={<Button size="xs" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => setCr(EMPTY)}>クリア</Button>} />
          <CardBody className="space-y-3">
            <Field label="装置種別">
              <Select value={cr.type} onChange={(e) => set("type", e.target.value as EquipmentType | "")}>
                <option value="">指定なし</option>
                {EQUIPMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{EQUIPMENT_TYPES[k].label}</option>)}
              </Select>
            </Field>
            <Field label={`処理能力${cr.type ? `（${EQUIPMENT_TYPES[cr.type].capacityUnit}）` : ""}`}>
              <NumberInput value={cr.capacity} onChange={(v) => set("capacity", v)} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="W"><NumberInput value={cr.width} onChange={(v) => set("width", v)} /></Field>
              <Field label="D"><NumberInput value={cr.depth} onChange={(v) => set("depth", v)} /></Field>
              <Field label="H"><NumberInput value={cr.height} onChange={(v) => set("height", v)} /></Field>
            </div>
            <Field label="主要材質">
              <Select value={cr.material} onChange={(e) => set("material", e.target.value)}>
                <option value="">指定なし</option>
                {MATERIALS.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="設置環境">
              <Select value={cr.environment} onChange={(e) => set("environment", e.target.value)}>
                <option value="">指定なし</option>
                {ENVIRONMENTS.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="制御方式">
              <Select value={cr.control} onChange={(e) => set("control", e.target.value)}>
                <option value="">指定なし</option>
                {CONTROLS.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="顧客業種">
              <Select value={cr.industry} onChange={(e) => set("industry", e.target.value)}>
                <option value="">指定なし</option>
                {INDUSTRIES.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="キーワード（ワーク・特記事項など）">
              <Input value={cr.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="例：アルミダイカスト、防爆" />
            </Field>
            <Field label="オプション">
              <div className="flex flex-wrap gap-1">
                {OPTION_PRESETS.map((o) => {
                  const on = cr.options.includes(o);
                  return (
                    <button key={o} onClick={() => set("options", on ? cr.options.filter((x) => x !== o) : [...cr.options, o])} className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset transition-colors", on ? "bg-ai-700 text-white ring-ai-700" : "bg-white text-stone-600 ring-stone-300 hover:ring-ai-400")}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Checkbox checked={cr.includeLost} onChange={(v) => set("includeLost", v)} label={<span className="text-xs">失注案件も含める（失注理由の参照）</span>} />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title={`検索結果（類似度順・上位${results.length}件）`} description="チェックを入れた案件（最大4件）を下段で並べて比較できます" />
            {results.length === 0 ? (
              <EmptyState icon={<Search size={20} />} title="該当する案件がありません" />
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="w-10">比較</th>
                      <th className="w-40">類似度</th>
                      <th>案件</th>
                      <th>主な仕様</th>
                      <th className="text-right">受注金額</th>
                      <th className="text-right">粗利率</th>
                      <th className="text-right">リードタイム</th>
                      <th className="text-right">納入後の修理</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(({ c, score, reasons }, i) => {
                      const x = info(c);
                      const on = compare.includes(c.id);
                      return (
                        <motion.tr key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className={cn(on && "bg-ai-50/70")}>
                          <td>
                            <input type="checkbox" className="h-4 w-4 cursor-pointer accent-ai-700" checked={on} disabled={!on && compare.length >= 4} onChange={() => toggle(c.id)} aria-label="比較に追加" />
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-stone-200">
                                <motion.div className={cn("h-full rounded-full", score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-ai-500" : "bg-stone-400")} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }} />
                              </div>
                              <span className="font-num text-[13px] font-bold">{score}</span>
                            </div>
                            <div className="mt-0.5 line-clamp-1 text-[10px] text-stone-500">{reasons.slice(0, 2).join("・")}</div>
                          </td>
                          <td className="min-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-num text-[11px] font-semibold text-shu-600">{c.workNo ?? c.dealNo}</span>
                              {c.status === "lost" ? <Badge className="bg-stone-100 text-stone-500 ring-stone-300">失注</Badge> : <StageBadge stage={c.stage} />}
                            </div>
                            <Link href={`/cases/${c.id}`} className="font-medium hover:text-ai-700 hover:underline">{c.title}</Link>
                            <div className="text-[11px] text-stone-500">{lk.customer.get(c.customerId)?.name}</div>
                          </td>
                          <td className="text-xs text-stone-600">
                            <div>{EQUIPMENT_TYPES[c.equipmentType].label}　<span className="font-num font-medium text-stone-800">{num(c.specs.capacity)}{c.specs.capacityUnit}</span></div>
                            <div>{c.specs.material}／{c.specs.environment}</div>
                          </td>
                          <td className="font-num text-right text-[13px]">{manYen(x.price)}</td>
                          <td className={cn("font-num text-right text-[13px]", canCost && x.margin < 0.2 && "text-rose-600")}>{canCost ? pct(x.margin) : "＊＊＊"}</td>
                          <td className="font-num text-right text-xs">{x.lead !== undefined ? `${x.lead}日` : "—"}</td>
                          <td className="font-num text-right text-xs">{c.stage === "aftercare" ? `${x.repairs}件` : "—"}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <AnimatePresence>
            {compare.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <Card className="overflow-hidden">
                  <CardHeader title={`比較表（${compare.length}件）`} icon={<GitCompare size={16} />} actions={<Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => setCompare([])}>比較をクリア</Button>} />
                  <div className="scroll-thin overflow-x-auto">
                    <CompareTable ids={base ? [base.id, ...compare] : compare} baseId={base?.id} info={info} canCost={canCost} canEdit={canEdit} onRemove={(id) => setCompare((p) => p.filter((x) => x !== id))} />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CompareTable({ ids, baseId, info, canCost, canEdit, onRemove }: { ids: string[]; baseId?: string; info: (c: Case) => { price: number; cost: Case["costEstimate"]; costTotal: number; margin: number; lead?: number; svc: number; repairs: number; perCap: number }; canCost: boolean; canEdit: boolean; onRemove: (id: string) => void }) {
  const lk = useLookups();
  const router = useRouter();
  const cols = ids.map((id) => lk.case.get(id)!).filter(Boolean);
  const rows: { label: string; render: (c: Case) => React.ReactNode; cost?: boolean; group?: string }[] = [
    { group: "基本", label: "顧客", render: (c) => lk.customer.get(c.customerId)?.name },
    { label: "装置種別", render: (c) => EQUIPMENT_TYPES[c.equipmentType].label },
    { label: "処理能力", render: (c) => <span className="font-num font-bold">{num(c.specs.capacity)} {c.specs.capacityUnit}</span> },
    { label: "外形寸法", render: (c) => <span className="font-num">{num(c.specs.width)}×{num(c.specs.depth)}×{num(c.specs.height)}</span> },
    { label: "材質", render: (c) => c.specs.material },
    { label: "制御", render: (c) => c.specs.control },
    { label: "設置環境", render: (c) => c.specs.environment },
    { label: "オプション", render: (c) => <span className="text-[11px]">{c.specs.options.join("、") || "—"}</span> },
    { group: "金額・原価", label: "受注金額", render: (c) => <span className="font-num font-bold">{yen(info(c).price)}</span> },
    { label: "能力あたり単価", render: (c) => <span className="font-num">{yen(info(c).perCap)}／{c.specs.capacityUnit}</span> },
    { label: "原価（実績優先）", cost: true, render: (c) => <span className="font-num">{yen(info(c).costTotal)}<span className="ml-1 text-[10px] text-stone-400">{c.actualCost ? "実績" : "見積"}</span></span> },
    { label: "粗利率", cost: true, render: (c) => <span className={cn("font-num font-bold", info(c).margin < 0.2 ? "text-rose-600" : "text-emerald-700")}>{pct(info(c).margin)}</span> },
    {
      label: "原価構成",
      cost: true,
      render: (c) => {
        const x = info(c);
        return (
          <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded">
            {COST_KEYS.map((k) => <div key={k} style={{ width: `${(x.cost[k] / (x.costTotal || 1)) * 100}%`, background: COST_COLORS[k] }} title={`${COST_LABELS[k]} ${yen(x.cost[k])}`} />)}
          </div>
        );
      },
    },
    ...COST_KEYS.map((k) => ({ label: `　${COST_LABELS[k]}`, cost: true, render: (c: Case) => <span className="font-num text-xs text-stone-600">{yen(info(c).cost[k])}</span> })),
    { group: "実績", label: "リードタイム", render: (c) => (info(c).lead !== undefined ? `${info(c).lead}日` : "—") },
    { label: "BOM品目数", render: (c) => `${c.bom.length}行` },
    { label: "納入後サービス／修理", render: (c) => (c.stage === "aftercare" ? `${info(c).svc}件／${info(c).repairs}件` : "—") },
    { label: "失注理由・メモ", render: (c) => <span className="text-[11px] text-stone-600">{c.lostReason ?? c.notes.find((n) => n.pinned)?.text ?? "—"}</span> },
  ];
  return (
    <table className="tbl tbl-compact" style={{ minWidth: 160 + ids.length * 220 }}>
      <thead>
        <tr>
          <th className="w-40">項目</th>
          {cols.map((c) => (
            <th key={c.id} className={cn("min-w-[200px] align-top", c.id === baseId && "bg-shu-50")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-num text-[11px] text-shu-600">{c.id === baseId ? "検索元 " : ""}{c.workNo ?? c.dealNo}</div>
                  <div className="whitespace-normal text-[13px] font-bold text-stone-800">{c.title}</div>
                </div>
                {c.id !== baseId && (
                  <button onClick={() => onRemove(c.id)} className="text-stone-400 hover:text-stone-700" aria-label="除外">
                    <X size={13} />
                  </button>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows
          .filter((r) => !r.cost || canCost)
          .map((r) => (
            <tr key={r.label}>
              <td className="text-xs font-medium text-stone-500">
                {r.group && <div className="mb-0.5 text-[10px] font-bold tracking-wider text-ai-700">{r.group}</div>}
                {r.label}
              </td>
              {cols.map((c) => (
                <td key={c.id} className={cn("text-[13px]", c.id === baseId && "bg-shu-50/50")}>{r.render(c)}</td>
              ))}
            </tr>
          ))}
        {!canCost && (
          <tr>
            <td colSpan={cols.length + 1} className="py-3 text-center text-xs text-stone-400">原価・粗利は閲覧権限のあるユーザーのみ表示されます</td>
          </tr>
        )}
        <tr>
          <td />
          {cols.map((c) => (
            <td key={c.id} className="py-3">
              <div className="flex flex-col gap-1.5">
                <Button size="xs" icon={<ExternalLink size={12} />} onClick={() => router.push(`/cases/${c.id}`)}>案件を開く</Button>
                {canEdit && c.id !== baseId && (
                  <Button size="xs" variant="primary" icon={<Copy size={12} />} onClick={() => router.push(`/cases/new?from=${c.id}`)}>
                    この案件をベースに引合登録
                  </Button>
                )}
                {c.id === baseId && <span className="flex items-center gap-1 text-[11px] text-shu-700"><Check size={12} />比較の基準</span>}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
