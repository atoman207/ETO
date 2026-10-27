"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Save, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { bomTotal, cn, costTotal, fmtDateTime, pct, yen } from "@/lib/format";
import { COST_COLORS, COST_KEYS, COST_LABELS } from "@/lib/constants";
import { similarity } from "@/lib/similarity";
import type { Case, CostBreakdown } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/form";
import { LockedNotice, SectionTitle } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

function CostBar({ cost, label, sub, highlight }: { cost: CostBreakdown; label: string; sub?: string; highlight?: boolean }) {
  const total = costTotal(cost) || 1;
  return (
    <div className={cn("grid grid-cols-[150px_1fr] items-center gap-3 rounded-md px-2 py-1.5", highlight && "bg-shu-50/60")}>
      <div className="min-w-0">
        <div className={cn("truncate text-xs", highlight ? "font-bold text-shu-700" : "text-stone-700")}>{label}</div>
        {sub && <div className="truncate text-[0.625rem] text-stone-400">{sub}</div>}
      </div>
      <div className="flex h-5 gap-[2px] overflow-hidden rounded-sm">
        {COST_KEYS.map((k, i) => (
          <motion.div
            key={k}
            className="group relative h-full first:rounded-l-sm last:rounded-r-sm"
            style={{ background: COST_COLORS[k] }}
            initial={{ width: 0 }}
            animate={{ width: `${(cost[k] / total) * 100}%` }}
            transition={{ duration: 0.7, delay: i * 0.03 }}
            title={`${COST_LABELS[k]}：${yen(cost[k])}（${pct(cost[k] / total)}）`}
          />
        ))}
      </div>
    </div>
  );
}

export function CostTab({ c }: CaseTabProps) {
  const canCost = useCan("viewCost");
  const canEditCase = useCan("editCase");
  const canEditBom = useCan("editBom");
  const canEdit = canEditCase || canEditBom;
  const cases = useStore((s) => s.cases);
  const confirmCost = useStore((s) => s.confirmCost);
  const update = useStore((s) => s.updateCase);
  const lk = useLookups();
  const [draft, setDraft] = useState<CostBreakdown>(c.costEstimate);
  useEffect(() => setDraft(c.costEstimate), [c.costEstimate]);

  const price = c.order?.orderAmount ?? c.expectedAmount;
  const total = costTotal(draft);
  const margin = price ? 1 - total / price : 0;
  const dirty = COST_KEYS.some((k) => draft[k] !== c.costEstimate[k]);
  const bomCost = bomTotal(c.bom) * (c.order?.quantity ?? 1);

  const refs = useMemo(() => {
    const cust = lk.customer.get(c.customerId);
    const scored = cases
      .filter((x) => x.id !== c.id && x.order && x.status !== "lost")
      .map((x) => ({ x, ...similarity({ equipmentType: c.equipmentType, specs: c.specs, industry: cust?.industry }, x, lk.customer.get(x.customerId)) }));
    const pinned = scored.filter((s) => c.referenceCaseIds.includes(s.x.id));
    const others = scored.filter((s) => !c.referenceCaseIds.includes(s.x.id) && s.score >= 50).sort((a, b) => b.score - a.score);
    return [...pinned, ...others].slice(0, 4);
  }, [cases, c, lk]);

  if (!canCost) return <LockedNotice message="原価情報の閲覧権限がありません（営業・設計・購買・管理職のみ閲覧可能）" />;

  const applyFrom = (src: Case) => {
    const base = src.actualCost ?? src.costEstimate;
    const srcPrice = src.order?.orderAmount ?? src.expectedAmount;
    const ratio = price && srcPrice ? price / srcPrice : 1;
    const next = {} as CostBreakdown;
    COST_KEYS.forEach((k) => (next[k] = Math.round((base[k] * ratio) / 1000) * 1000));
    setDraft(next);
    toast.success(`${src.workNo} の${src.actualCost ? "実績" : "見積"}原価を金額比 ${ratio.toFixed(2)} 倍で適用しました`, { description: "保存するまで確定されません" });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <CardHeader
            title="見積原価（概算）"
            description={c.costCheckedAt ? `${lk.user.get(c.costCheckedBy ?? "")?.name ?? ""}が ${fmtDateTime(c.costCheckedAt)} に確認済み` : "原価確認は未完了です"}
            actions={
              canEdit && (
                <>
                  <Button size="sm" icon={<Save size={13} />} disabled={!dirty} onClick={() => { update(c.id, { costEstimate: draft }, "見積原価を更新しました"); toast.success("見積原価を保存しました"); }}>
                    保存
                  </Button>
                  {(c.stage === "inquiry" || c.stage === "costing") && (
                    <Button size="sm" variant="accent" icon={<CheckCircle2 size={13} />} onClick={() => { confirmCost(c.id, draft); toast.success("原価確認を完了しました", { description: "見積・仕様検討ステージへ進みました" }); }}>
                      原価確認を完了して見積へ
                    </Button>
                  )}
                </>
              )
            }
          />
          <CardBody>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {COST_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COST_COLORS[k] }} />
                  <span className="w-28 shrink-0 text-[0.8125rem] text-stone-700">{COST_LABELS[k]}</span>
                  <NumberInput value={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} suffix="円" className="flex-1" disabled={!canEdit} />
                  <span className="font-num w-12 text-right text-[0.6875rem] text-stone-500">{total ? pct(draft[k] / total, 0) : "—"}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 rounded-lg bg-kinari p-4 sm:grid-cols-4">
              <div>
                <div className="text-[0.6875rem] text-stone-500">見積原価 合計</div>
                <div className="font-num text-lg font-bold">{yen(total)}</div>
              </div>
              <div>
                <div className="text-[0.6875rem] text-stone-500">{c.order ? "受注金額" : "見込金額"}</div>
                <div className="font-num text-lg font-bold">{yen(price)}</div>
              </div>
              <div>
                <div className="text-[0.6875rem] text-stone-500">粗利</div>
                <div className="font-num text-lg font-bold">{yen(price - total)}</div>
              </div>
              <div>
                <div className="text-[0.6875rem] text-stone-500">粗利率（目標 25%）</div>
                <div className={cn("font-num text-lg font-bold", margin < 0.2 ? "text-rose-600" : margin < 0.25 ? "text-amber-600" : "text-emerald-700")}>{price ? pct(margin) : "—"}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                  <motion.div className={cn("h-full rounded-full", margin < 0.2 ? "bg-rose-500" : margin < 0.25 ? "bg-amber-500" : "bg-emerald-500")} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, (margin / 0.4) * 100))}%` }} />
                </div>
              </div>
            </div>
            {!price && <p className="mt-2 text-xs text-amber-700">見込金額が未入力のため、粗利率を計算できません。概要タブの「編集」から入力してください。</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="原価構成の比較" description="本案件と類似案件の原価構成比（各セグメントにカーソルを合わせると金額を表示）" />
          <CardBody>
            <CostBar cost={draft} label="本案件（見積）" sub={c.workNo ?? c.dealNo} highlight />
            {c.actualCost && <CostBar cost={c.actualCost} label="本案件（実績）" sub="納品後に集計" highlight />}
            {refs.map(({ x }) => (
              <CostBar key={x.id} cost={x.actualCost ?? x.costEstimate} label={`${x.workNo} ${x.title}`} sub={x.actualCost ? "実績原価" : "見積原価"} />
            ))}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-100 pt-3">
              {COST_KEYS.map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-[0.6875rem] text-stone-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COST_COLORS[k] }} />
                  {COST_LABELS[k]}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        {c.actualCost && (
          <Card>
            <CardHeader title="見積原価と実績原価の差異" description="次回見積の精度向上に活用されます" />
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>費目</th>
                    <th className="text-right">見積原価</th>
                    <th className="text-right">実績原価</th>
                    <th className="text-right">差異</th>
                    <th className="text-right">差異率</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_KEYS.map((k) => {
                    const e = c.costEstimate[k];
                    const a = c.actualCost![k];
                    const d = a - e;
                    return (
                      <tr key={k}>
                        <td>{COST_LABELS[k]}</td>
                        <td className="font-num text-right">{yen(e)}</td>
                        <td className="font-num text-right">{yen(a)}</td>
                        <td className={cn("font-num text-right", d > 0 ? "text-rose-600" : "text-emerald-700")}>{d > 0 ? "+" : ""}{yen(d)}</td>
                        <td className="text-right">
                          <span className={cn("font-num inline-flex items-center gap-1 text-xs", e && d / e > 0.1 ? "font-bold text-rose-600" : "text-stone-600")}>
                            {d > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {e ? pct(d / e) : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold">
                    <td>合計</td>
                    <td className="font-num text-right">{yen(costTotal(c.costEstimate))}</td>
                    <td className="font-num text-right">{yen(costTotal(c.actualCost))}</td>
                    <td className="font-num text-right">{yen(costTotal(c.actualCost) - costTotal(c.costEstimate))}</td>
                    <td className="font-num text-right">{pct(costTotal(c.actualCost) / costTotal(c.costEstimate) - 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="類似案件の原価を参考にする" description="ボタンひとつで原価構成を金額比で適用できます" />
          <div>
            {refs.length === 0 && <div className="px-5 py-6 text-center text-xs text-stone-500">類似案件が見つかりません</div>}
            {refs.map(({ x, score }) => {
              const p = x.order?.orderAmount ?? x.expectedAmount;
              const cst = costTotal(x.actualCost ?? x.costEstimate);
              return (
                <div key={x.id} className="border-b border-stone-50 px-5 py-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/cases/${x.id}?tab=cost`} className="font-num text-[0.6875rem] font-semibold text-shu-600 hover:underline">{x.workNo}</Link>
                    <div className="flex items-center gap-1">
                      {c.referenceCaseIds.includes(x.id) && <Badge className="bg-ai-50 text-ai-700 ring-ai-200">参考案件</Badge>}
                      <Badge>類似度 {score}</Badge>
                    </div>
                  </div>
                  <div className="text-[0.8125rem] font-medium">{x.title}</div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[0.6875rem] text-stone-500">
                    <span>受注 <span className="font-num block text-stone-800">{(p / 10000).toLocaleString()}万</span></span>
                    <span>{x.actualCost ? "実績原価" : "見積原価"} <span className="font-num block text-stone-800">{(cst / 10000).toLocaleString()}万</span></span>
                    <span>粗利率 <span className={cn("font-num block", 1 - cst / p < 0.2 ? "text-rose-600" : "text-stone-800")}>{pct(1 - cst / p)}</span></span>
                  </div>
                  {canEdit && (
                    <Button size="xs" className="mt-2" icon={<Download size={12} />} onClick={() => applyFrom(x)}>
                      この原価構成を適用
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {c.bom.length > 0 && (
          <Card>
            <CardBody>
              <SectionTitle>BOM積上げとの比較</SectionTitle>
              <div className="space-y-2 text-[0.8125rem]">
                <div className="flex justify-between">
                  <span className="text-stone-500">見積（材料費＋購入品費）</span>
                  <span className="font-num">{yen(c.costEstimate.material + c.costEstimate.purchased)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">BOM積上げ合計</span>
                  <span className="font-num">{yen(bomCost)}</span>
                </div>
                {(() => {
                  const est = c.costEstimate.material + c.costEstimate.purchased;
                  const d = bomCost - est;
                  return (
                    <div className={cn("flex justify-between border-t border-stone-100 pt-2 font-bold", d > 0 ? "text-rose-600" : "text-emerald-700")}>
                      <span>差異</span>
                      <span className="font-num">
                        {d > 0 ? "+" : ""}
                        {yen(d)}（{est ? pct(d / est) : "—"}）
                      </span>
                    </div>
                  );
                })()}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
