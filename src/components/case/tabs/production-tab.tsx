"use client";

import { motion } from "framer-motion";
import { Factory } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { addDays, cn, diffDays, fmtDate, toDate, today } from "@/lib/format";
import { PROCESS_STATUS } from "@/lib/constants";
import type { ProcessStatus } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, DueLabel, EmptyState, ProgressBar } from "@/components/ui/misc";

export function ProductionTab({ c }: CaseTabProps) {
  const update = useStore((s) => s.updateProcess);
  const users = useStore((s) => s.users);
  const canEdit = useCan("editProduction");
  const lk = useLookups();

  if (c.processes.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Factory size={20} />} title="製造工程は工番発行時に自動計画されます" description="受注登録・工番発行を行うと、納期から逆算した標準9工程が作成されます。" />
      </Card>
    );
  }

  const t = today();
  const start = c.processes.reduce((m, p) => (p.startDate < m ? p.startDate : m), c.processes[0].startDate);
  const endRaw = c.order?.deliveryDate ?? c.processes.reduce((m, p) => (p.endDate > m ? p.endDate : m), c.processes[0].endDate);
  const end = addDays(endRaw, 5);
  const span = Math.max(1, diffDays(end, start));
  const pos = (d: string) => (diffDays(d, start) / span) * 100;
  const overall = Math.round(c.processes.reduce((s, p) => s + p.progress, 0) / c.processes.length);
  const months: { label: string; left: number }[] = [];
  const s = toDate(start);
  for (let d = new Date(s.getFullYear(), s.getMonth() + 1, 1); d <= toDate(end); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    months.push({ label: `${d.getMonth() + 1}月`, left: pos(iso) });
  }
  const todayPos = pos(t);
  const assignable = users.filter((u) => ["engineer", "production", "purchasing"].includes(u.role));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="text-[11px] text-stone-500">全体進捗</div>
          <div className="font-num text-lg font-bold">{overall}%</div>
          <ProgressBar value={overall} className="mt-1" height={5} />
        </div>
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="text-[11px] text-stone-500">納期</div>
          <div className="text-[13px] font-bold">{c.order ? <DueLabel date={c.order.deliveryDate} doneLabel={c.stage === "aftercare" ? "納品済" : undefined} /> : "—"}</div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="text-[11px] text-stone-500">進行中の工程</div>
          <div className="text-[13px] font-bold">{c.processes.filter((p) => p.status === "doing" || p.status === "delayed").map((p) => p.name).join("・") || "—"}</div>
        </div>
        <div className={cn("rounded-lg border bg-white px-4 py-3 shadow-[var(--shadow-card)]", c.processes.some((p) => p.status === "delayed") ? "border-rose-300" : "border-stone-200")}>
          <div className="text-[11px] text-stone-500">遅延工程</div>
          <div className={cn("text-[13px] font-bold", c.processes.some((p) => p.status === "delayed") ? "text-rose-600" : "")}>{c.processes.filter((p) => p.status === "delayed").length}件</div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="製造工程表（ガントチャート）" description={canEdit ? "進捗・日程・担当を直接更新できます。組立以降の工程に着手すると、案件のステージが「製造」に進みます。" : "工程の更新は製造・設計部門のユーザーのみ可能です"} />
        <div className="scroll-thin overflow-x-auto">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-[150px_120px_250px_170px_1fr] items-center border-b border-stone-200 bg-stone-50 text-[11px] font-medium text-stone-500">
              <div className="px-4 py-2">工程</div>
              <div className="px-2 py-2">担当</div>
              <div className="px-2 py-2">日程</div>
              <div className="px-2 py-2">進捗・状態</div>
              <div className="relative h-8">
                {months.map((m) => (
                  <span key={m.label + m.left} className="absolute top-2 -translate-x-1/2 text-[10px]" style={{ left: `${m.left}%` }}>
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
            {c.processes.map((p, i) => {
              const st = PROCESS_STATUS[p.status];
              const left = pos(p.startDate);
              const width = Math.max(0.8, pos(p.endDate) - left);
              return (
                <div key={p.id} className="grid grid-cols-[150px_120px_250px_170px_1fr] items-center border-b border-stone-50 text-[13px] hover:bg-stone-50/60">
                  <div className="px-4 py-2.5 font-medium">
                    <span className="font-num mr-1.5 text-[11px] text-stone-400">{i + 1}.</span>
                    {p.name}
                  </div>
                  <div className="px-2">
                    {canEdit ? (
                      <select className="cell-input text-xs" value={p.assigneeId ?? ""} onChange={(e) => update(c.id, p.id, { assigneeId: e.target.value || undefined })}>
                        <option value="">未割当</option>
                        {assignable.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Avatar user={p.assigneeId ? lk.user.get(p.assigneeId) : undefined} size={18} className="ring-0" />
                        {p.assigneeId ? lk.user.get(p.assigneeId)?.name : "未割当"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-2">
                    <input type="date" className="cell-input font-num w-[116px] text-[11px]" value={p.startDate} disabled={!canEdit} onChange={(e) => e.target.value && update(c.id, p.id, { startDate: e.target.value })} />
                    <span className="text-stone-400">〜</span>
                    <input type="date" className="cell-input font-num w-[116px] text-[11px]" value={p.endDate} disabled={!canEdit} onChange={(e) => e.target.value && update(c.id, p.id, { endDate: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    {canEdit ? (
                      <>
                        <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => update(c.id, p.id, { progress: Number(e.target.value) })} className="h-1 w-16 cursor-pointer accent-ai-700" aria-label={`${p.name}の進捗`} />
                        <span className="font-num w-8 text-right text-xs">{p.progress}%</span>
                        <select className="cell-input w-16 px-1 text-[11px]" value={p.status} onChange={(e) => update(c.id, p.id, { status: e.target.value as ProcessStatus })}>
                          {(Object.keys(PROCESS_STATUS) as ProcessStatus[]).map((k) => (
                            <option key={k} value={k}>
                              {PROCESS_STATUS[k].label}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <span className="font-num w-8 text-xs">{p.progress}%</span>
                        <Badge className={st.color}>{st.label}</Badge>
                      </>
                    )}
                  </div>
                  <div className="relative h-10">
                    {months.map((m) => (
                      <span key={m.left} className="absolute inset-y-0 w-px bg-stone-100" style={{ left: `${m.left}%` }} />
                    ))}
                    {todayPos >= 0 && todayPos <= 100 && <span className="absolute inset-y-0 z-10 w-[2px] bg-shu-500/70" style={{ left: `${todayPos}%` }} />}
                    <motion.div
                      className="absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded bg-stone-200"
                      style={{ left: `${left}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      title={`${p.name}：${fmtDate(p.startDate, false)}〜${fmtDate(p.endDate, false)}（${p.progress}%）`}
                    >
                      <motion.div className={cn("h-full", st.bar)} initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 0.6, delay: 0.2 + i * 0.04 }} />
                    </motion.div>
                  </div>
                </div>
              );
            })}
            {c.order && (
              <div className="grid grid-cols-[690px_1fr] items-center">
                <div className="px-4 py-2 text-right text-[11px] text-stone-500">納期 {fmtDate(c.order.deliveryDate, false)}</div>
                <div className="relative h-6">
                  <span className="absolute top-1 -translate-x-1/2 rounded bg-ai-800 px-1.5 text-[10px] text-white" style={{ left: `${pos(c.order.deliveryDate)}%` }}>
                    納期
                  </span>
                  {todayPos >= 0 && todayPos <= 100 && (
                    <span className="absolute top-1 -translate-x-1/2 rounded bg-shu-500 px-1.5 text-[10px] text-white" style={{ left: `${todayPos}%` }}>
                      本日
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
