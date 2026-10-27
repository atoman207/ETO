"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { addDays, cn, matches, today, yen } from "@/lib/format";
import { PO_STATUS } from "@/lib/constants";
import type { POStatus } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Input, SegmentedControl, Select } from "@/components/ui/form";
import { POCard } from "@/components/case/tabs/purchase-tab";

export default function PurchasingPage() {
  const pos = useStore((s) => s.purchaseOrders);
  const suppliers = useStore((s) => s.suppliers);
  const showCost = useCan("viewCost");
  const lk = useLookups();
  const [scope, setScope] = useState<"open" | POStatus | "all">("open");
  const [sup, setSup] = useState("all");
  const [q, setQ] = useState("");
  const t = today();

  const list = useMemo(
    () =>
      pos
        .filter((p) => {
          if (scope === "open" && (p.status === "received" || p.status === "cancelled")) return false;
          if (scope !== "open" && scope !== "all" && p.status !== scope) return false;
          if (sup !== "all" && p.supplierId !== sup) return false;
          const c = lk.case.get(p.caseId);
          return matches(q, p.poNo, c?.workNo, c?.title, lk.supplier.get(p.supplierId)?.name, ...p.lines.map((l) => l.name + l.partNo));
        })
        .sort((a, b) => (a.status === "requested" ? -1 : 0) - (b.status === "requested" ? -1 : 0) || a.dueDate.localeCompare(b.dueDate)),
    [pos, scope, sup, q, lk],
  );

  const open = pos.filter((p) => p.status !== "received" && p.status !== "cancelled");
  const cards = [
    { label: "購買依頼（未発注）", value: pos.filter((p) => p.status === "requested").length, tone: "text-amber-700", key: "requested" as const },
    { label: "発注済・入荷待ち", value: pos.filter((p) => p.status === "ordered" || p.status === "partial").length, tone: "text-sky-700", key: "ordered" as const },
    { label: "7日以内に入荷予定", value: open.filter((p) => p.status !== "requested" && p.dueDate >= t && p.dueDate <= addDays(t, 7)).length, tone: "text-emerald-700", key: "open" as const },
    { label: "納期遅れ", value: open.filter((p) => p.status !== "requested" && p.dueDate < t).length, tone: "text-rose-700", key: "open" as const },
  ];
  const openAmount = open.reduce((s, p) => s + p.lines.reduce((x, l) => x + l.qty * l.unitPrice, 0), 0);

  return (
    <div>
      <PageHeader
        title="購買管理"
        description={`全工番の発注・入荷状況を一元管理します${showCost ? `（未完了の発注残 ${yen(openAmount)}）` : ""}`}
        icon={<ShoppingCart size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "購買管理" }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => setScope(c.key)} className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-ai-300">
            <div className="text-[11px] text-stone-500">{c.label}</div>
            <div className={cn("font-num text-xl font-bold", c.tone)}>{c.value}<span className="ml-0.5 text-xs font-normal text-stone-500">件</span></div>
          </button>
        ))}
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <SegmentedControl
            value={scope}
            onChange={setScope}
            options={[
              { value: "open", label: "未完了" },
              { value: "requested", label: "購買依頼" },
              { value: "ordered", label: "発注済" },
              { value: "received", label: "入荷済" },
              { value: "all", label: "すべて" },
            ]}
          />
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="発注番号・工番・品名・品番" className="pl-9" />
          </div>
          <Select value={sup} onChange={(e) => setSup(e.target.value)} className="w-56">
            <option value="all">全仕入先</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <span className="ml-auto text-xs text-stone-500">
            <span className="font-num font-bold text-stone-800">{list.length}</span> 件
          </span>
        </div>
      </Card>
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<ShoppingCart size={20} />} title="該当する発注はありません" />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 80).map((p, i) => (
            <POCard key={p.id} po={p} index={i} showCase />
          ))}
          {list.length > 80 && <p className="py-2 text-center text-xs text-stone-500">他 {list.length - 80} 件（条件を絞り込んでください）</p>}
        </div>
      )}
    </div>
  );
}
