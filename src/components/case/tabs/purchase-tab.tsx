"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronDown, PackageCheck, Send, ShoppingCart, Trash2, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, fmtDate, yen } from "@/lib/format";
import { PO_STATUS } from "@/lib/constants";
import type { PurchaseOrder } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DueLabel, EmptyState, ProgressBar } from "@/components/ui/misc";

export function PurchaseTab({ c, goTab }: CaseTabProps) {
  const pos = useStore((s) => s.purchaseOrders);
  const createPR = useStore((s) => s.createPurchaseRequests);
  const canPurchase = useCan("purchase");
  const canBom = useCan("editBom");
  const showCost = useCan("viewCost");
  const list = useMemo(() => pos.filter((p) => p.caseId === c.id).sort((a, b) => a.issueDate.localeCompare(b.issueDate)), [pos, c.id]);
  const parentIds = new Set(c.bom.map((b) => b.parentId).filter(Boolean));
  const pending = c.bom.filter((b) => !parentIds.has(b.id) && b.procurement === "buy" && !b.poId).length;
  const active = list.filter((p) => p.status !== "cancelled");
  const received = active.filter((p) => p.status === "received").length;
  const total = active.reduce((s, p) => s + p.lines.reduce((x, l) => x + l.qty * l.unitPrice, 0), 0);

  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="発注書" value={`${active.length}件`} sub={`取消 ${list.length - active.length}件`} />
        <Stat label="発注金額合計" value={showCost ? yen(total) : "＊＊＊"} />
        <Stat label="入荷状況" value={`${received} / ${active.length}`} bar={active.length ? (received / active.length) * 100 : 0} />
        <Stat label="BOM未手配品" value={`${pending}点`} warn={pending > 0} sub={pending ? "BOMから購買依頼を作成できます" : "すべて手配済み"} />
      </div>

      {pending > 0 && (canPurchase || canBom) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-[0.8125rem] text-amber-900">BOMに未手配の購入品が {pending}点 あります。仕入先ごとに購買依頼を一括作成できます。</span>
          <Button
            variant="accent"
            size="sm"
            icon={<ShoppingCart size={14} />}
            onClick={() => {
              const r = createPR(c.id);
              if (r.created) toast.success(`購買依頼を${r.created}件作成しました`);
              else toast.error("仕入先が未設定の品目があります。BOMで仕入先を設定してください。", { action: { label: "BOMへ", onClick: () => goTab("bom") } });
            }}
          >
            購買依頼を一括作成
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<ShoppingCart size={20} />} title="発注データはまだありません" description="BOMを作成すると、購入品を仕入先ごとにまとめて購買依頼を作成できます。" action={<Button onClick={() => goTab("bom")}>BOMを確認</Button>} />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((po, i) => (
            <POCard key={po.id} po={po} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn, bar }: { label: string; value: string; sub?: string; warn?: boolean; bar?: number }) {
  return (
    <div className={cn("rounded-lg border bg-surface px-4 py-3 shadow-[var(--shadow-card)]", warn ? "border-amber-300" : "border-stone-200")}>
      <div className="text-[0.6875rem] text-stone-500">{label}</div>
      <div className="font-num text-lg font-bold">{value}</div>
      {bar !== undefined && <ProgressBar value={bar} className="mt-1" color="bg-emerald-500" height={5} />}
      {sub && <div className={cn("text-[0.625rem]", warn ? "text-amber-700" : "text-stone-500")}>{sub}</div>}
    </div>
  );
}

export function POCard({ po, index = 0, showCase }: { po: PurchaseOrder; index?: number; showCase?: boolean }) {
  const updateStatus = useStore((s) => s.updatePOStatus);
  const deletePO = useStore((s) => s.deletePO);
  const canPurchase = useCan("purchase");
  const showCost = useCan("viewCost");
  const lk = useLookups();
  const [open, setOpen] = useState(false);
  const sup = lk.supplier.get(po.supplierId);
  const c = lk.case.get(po.caseId);
  const amount = po.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const done = po.status === "received" || po.status === "cancelled";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
      <Card className={cn("overflow-hidden", po.status === "cancelled" && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <ChevronDown size={16} className={cn("shrink-0 text-stone-400 transition-transform", !open && "-rotate-90")} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-num text-[0.8125rem] font-bold">{po.poNo}</span>
                <Badge className={PO_STATUS[po.status].color}>{PO_STATUS[po.status].label}</Badge>
                {showCase && c && <span className="font-num text-[0.6875rem] font-semibold text-shu-600">{c.workNo}</span>}
              </div>
              <div className="truncate text-xs text-stone-600">
                {sup?.name}
                <span className="text-stone-400">（{sup?.category}）</span>
                {showCase && c && <span className="text-stone-400">　{c.title}</span>}
              </div>
            </div>
          </button>
          <div className="text-xs text-stone-500">
            <div>{po.status === "requested" ? "依頼日" : "発注日"}：<span className="font-num">{fmtDate(po.issueDate, false)}</span></div>
            <div>
              納期：{po.status === "received" ? <span className="font-num">入荷 {fmtDate(po.receivedDate, false)}</span> : po.status === "cancelled" ? "—" : <DueLabel date={po.dueDate} />}
            </div>
          </div>
          <div className="w-28 text-right">
            <div className="text-[0.625rem] text-stone-500">{po.lines.length}品目</div>
            <div className="font-num text-[0.8125rem] font-bold">{showCost ? yen(amount) : "＊＊＊"}</div>
          </div>
          {canPurchase && !done && (
            <div className="flex gap-1.5">
              {po.status === "requested" && (
                <>
                  <Button size="sm" variant="primary" icon={<Send size={13} />} onClick={() => { updateStatus(po.id, "ordered"); toast.success(`${po.poNo} を発注しました`, { description: `${sup?.name} へ注文書を送付（デモ）` }); }}>
                    発注する
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => { deletePO(po.id); toast("購買依頼を削除しました"); }}>
                    削除
                  </Button>
                </>
              )}
              {po.status === "ordered" && (
                <Button size="sm" icon={<Truck size={13} />} onClick={() => { updateStatus(po.id, "partial"); toast.success("一部入荷を登録しました"); }}>
                  一部入荷
                </Button>
              )}
              {(po.status === "ordered" || po.status === "partial") && (
                <>
                  <Button size="sm" variant="success" icon={<PackageCheck size={13} />} onClick={() => { updateStatus(po.id, "received"); toast.success("入荷を登録しました"); }}>
                    入荷登録
                  </Button>
                  <Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={() => { updateStatus(po.id, "cancelled"); toast("発注を取消しました"); }}>
                    取消
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <table className="tbl tbl-compact border-t border-stone-100">
                <thead>
                  <tr>
                    <th>品番</th>
                    <th>品名</th>
                    <th>型式・仕様</th>
                    <th className="text-right">数量</th>
                    <th className="text-right">単価</th>
                    <th className="text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="font-num text-xs">{l.partNo}</td>
                      <td className="text-[0.8125rem]">{l.name}</td>
                      <td className="text-xs text-stone-500">{l.spec}</td>
                      <td className="font-num text-right text-xs">
                        {l.qty} {l.unit}
                      </td>
                      <td className="font-num text-right text-xs">{showCost ? yen(l.unitPrice) : "＊＊＊"}</td>
                      <td className="font-num text-right text-xs">{showCost ? yen(l.qty * l.unitPrice) : "＊＊＊"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
