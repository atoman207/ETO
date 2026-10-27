"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Factory } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { addDays, cn, diffDays, fmtDate, toDate, today } from "@/lib/format";
import { PROCESS_STATUS } from "@/lib/constants";
import { PageHeader, DueLabel, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/badge";

export default function ProductionPage() {
  const cases = useStore((s) => s.cases);
  const lk = useLookups();
  const t = today();
  const list = useMemo(() => cases.filter((c) => c.workNo && c.stage !== "aftercare" && c.processes.length).sort((a, b) => (a.order?.deliveryDate ?? "").localeCompare(b.order?.deliveryDate ?? "")), [cases]);

  if (list.length === 0) {
    return (
      <div>
        <PageHeader title="製造進捗" icon={<Factory size={20} />} />
        <Card>
          <EmptyState title="進行中の工番はありません" />
        </Card>
      </div>
    );
  }

  const start = addDays(t, -150);
  const end = addDays(t, 150);
  const span = diffDays(end, start);
  const pos = (d: string) => Math.max(0, Math.min(100, (diffDays(d, start) / span) * 100));
  const months: { label: string; left: number }[] = [];
  const s = toDate(start);
  for (let d = new Date(s.getFullYear(), s.getMonth() + 1, 1); d <= toDate(end); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    months.push({ label: `${d.getFullYear() !== s.getFullYear() && d.getMonth() === 0 ? `${d.getFullYear()}年` : ""}${d.getMonth() + 1}月`, left: pos(iso) });
  }
  const delayed = list.filter((c) => c.processes.some((p) => p.status === "delayed"));
  const thisMonth = list.filter((c) => c.order?.deliveryDate.slice(0, 7) === t.slice(0, 7) || (c.order && diffDays(c.order.deliveryDate, t) <= 30));
  const avg = Math.round(list.reduce((sum, c) => sum + c.processes.reduce((x, p) => x + p.progress, 0) / c.processes.length, 0) / list.length);

  return (
    <div>
      <PageHeader title="製造進捗（全工番）" description="工事番号ごとの工程計画と進捗を一覧します。バーにカーソルを合わせると工程の詳細を表示します" icon={<Factory size={20} />} breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "製造進捗" }]} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "進行中の工番", value: `${list.length}件` },
          { label: "平均進捗", value: `${avg}%` },
          { label: "30日以内に納期", value: `${thisMonth.length}件`, warn: thisMonth.length > 0 },
          { label: "遅延工程あり", value: `${delayed.length}件`, danger: delayed.length > 0 },
        ].map((x) => (
          <div key={x.label} className={cn("rounded-lg border bg-white px-4 py-3 shadow-[var(--shadow-card)]", x.danger ? "border-rose-300" : x.warn ? "border-amber-300" : "border-stone-200")}>
            <div className="text-[11px] text-stone-500">{x.label}</div>
            <div className={cn("font-num text-xl font-bold", x.danger && "text-rose-600")}>{x.value}</div>
          </div>
        ))}
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="工番別 工程計画（前後5ヶ月）"
          actions={
            <div className="flex flex-wrap gap-3 text-[11px] text-stone-600">
              {(Object.keys(PROCESS_STATUS) as (keyof typeof PROCESS_STATUS)[]).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", PROCESS_STATUS[k].bar)} />
                  {PROCESS_STATUS[k].label}
                </span>
              ))}
            </div>
          }
        />
        <div className="scroll-thin overflow-x-auto">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-[320px_1fr] border-b border-stone-200 bg-stone-50 text-[11px] text-stone-500">
              <div className="px-4 py-2">工番・案件</div>
              <div className="relative">
                {months.map((m) => (
                  <span key={m.left} className="absolute top-2 -translate-x-1/2 whitespace-nowrap" style={{ left: `${m.left}%` }}>{m.label}</span>
                ))}
              </div>
            </div>
            {list.map((c, i) => {
              const prog = Math.round(c.processes.reduce((x, p) => x + p.progress, 0) / c.processes.length);
              const isDelayed = c.processes.some((p) => p.status === "delayed");
              return (
                <div key={c.id} className="grid grid-cols-[320px_1fr] border-b border-stone-50 hover:bg-stone-50/60">
                  <Link href={`/cases/${c.id}?tab=production`} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar user={lk.user.get(c.engineerId ?? "")} size={26} className="ring-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-num text-xs font-bold text-shu-600">{c.workNo}</span>
                        <StageBadge stage={c.stage} />
                        {isDelayed && <AlertTriangle size={13} className="text-rose-500" />}
                      </div>
                      <div className="truncate text-[13px] font-medium">{c.title}</div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span className="truncate">{lk.customer.get(c.customerId)?.name}</span>
                        <span className="shrink-0">進捗 <span className="font-num font-bold text-stone-700">{prog}%</span></span>
                      </div>
                    </div>
                  </Link>
                  <div className="relative h-[62px]">
                    {months.map((m) => <span key={m.left} className="absolute inset-y-0 w-px bg-stone-100" style={{ left: `${m.left}%` }} />)}
                    <span className="absolute inset-y-0 z-10 w-[2px] bg-shu-500/70" style={{ left: `${pos(t)}%` }} />
                    <div className="absolute top-[18px] flex h-3.5" style={{ left: 0, right: 0 }}>
                      {c.processes.map((p, pi) => {
                        const l = pos(p.startDate);
                        const w = Math.max(0.4, pos(p.endDate) - l);
                        return (
                          <motion.div
                            key={p.id}
                            title={`${p.name}：${fmtDate(p.startDate, false)}〜${fmtDate(p.endDate, false)}（${PROCESS_STATUS[p.status].label} ${p.progress}%）`}
                            className={cn("absolute h-full rounded-[3px] border border-white", PROCESS_STATUS[p.status].bar, p.status === "todo" && "opacity-70")}
                            style={{ left: `${l}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${w}%` }}
                            transition={{ duration: 0.5, delay: i * 0.03 + pi * 0.02 }}
                          />
                        );
                      })}
                    </div>
                    {c.order && (
                      <span className="absolute top-[38px] -translate-x-1/2 whitespace-nowrap text-[10px]" style={{ left: `${pos(c.order.deliveryDate)}%` }}>
                        <span className="rounded bg-ai-800 px-1 text-white">納期</span>
                        <span className="ml-1"><DueLabel date={c.order.deliveryDate} /></span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
