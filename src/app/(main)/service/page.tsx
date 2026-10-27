"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, fmtDate, matches, yen } from "@/lib/format";
import { BILLING, SERVICE_STATUS, SERVICE_TYPES } from "@/lib/constants";
import type { ServiceStatus, ServiceType } from "@/lib/types";
import { PageHeader, Avatar, DueLabel, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, SegmentedControl, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ServiceFormModal } from "@/components/service/service-form-modal";

export default function ServicePage() {
  const services = useStore((s) => s.services);
  const users = useStore((s) => s.users);
  const canService = useCan("editService");
  const lk = useLookups();
  const router = useRouter();
  const [scope, setScope] = useState<"open" | "all" | "done">("open");
  const [type, setType] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      services
        .filter((s) => {
          if (scope === "open" && s.status === "done") return false;
          if (scope === "done" && s.status !== "done") return false;
          if (type !== "all" && s.type !== type) return false;
          if (assignee !== "all" && s.assigneeId !== assignee) return false;
          const eq = lk.equipment.get(s.equipmentId);
          return matches(q, s.ticketNo, s.title, s.description, eq?.serialNo, eq?.name, lk.customer.get(eq?.customerId ?? "")?.name);
        })
        .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate)),
    [services, scope, type, assignee, q, lk],
  );

  const stat = (Object.keys(SERVICE_STATUS) as ServiceStatus[]).map((k) => ({ k, n: services.filter((s) => s.status === k).length }));
  const byType = (Object.keys(SERVICE_TYPES) as ServiceType[]).map((k) => ({ k, n: services.filter((s) => s.type === k).length }));
  const maxType = Math.max(1, ...byType.map((x) => x.n));

  return (
    <div>
      <PageHeader
        title="アフターサービス（修理・改造・部品交換）"
        description="納入装置ごとにサービス履歴を蓄積し、改造・更新の案件化までつなげます"
        icon={<Wrench size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "アフターサービス" }]}
        actions={canService && <Button variant="accent" icon={<Plus size={15} />} onClick={() => setOpen(true)}>サービス受付</Button>}
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat.map(({ k, n }) => (
            <div key={k} className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-[var(--shadow-card)]">
              <Badge className={SERVICE_STATUS[k].color}>{SERVICE_STATUS[k].label}</Badge>
              <div className="font-num mt-1 text-xl font-bold">{n}<span className="ml-0.5 text-xs font-normal text-stone-500">件</span></div>
            </div>
          ))}
        </div>
        <Card className="px-4 py-3">
          <div className="mb-1.5 text-[11px] font-medium text-stone-500">種別ごとの件数（累計）</div>
          <div className="space-y-1">
            {byType.map(({ k, n }) => (
              <div key={k} className="grid grid-cols-[64px_1fr_28px] items-center gap-2 text-[11px]">
                <span className="text-stone-600">{SERVICE_TYPES[k].label}</span>
                <div className="h-2.5 overflow-hidden rounded bg-stone-100">
                  <motion.div className="h-full rounded bg-violet-500/80" initial={{ width: 0 }} animate={{ width: `${(n / maxType) * 100}%` }} transition={{ duration: 0.7 }} />
                </div>
                <span className="font-num text-right text-stone-700">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <SegmentedControl value={scope} onChange={setScope} options={[{ value: "open", label: "対応中" }, { value: "done", label: "完了" }, { value: "all", label: "すべて" }]} />
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="受付番号・件名・製造番号・顧客" className="pl-9" />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-32">
            <option value="all">全種別</option>
            {(Object.keys(SERVICE_TYPES) as ServiceType[]).map((k) => <option key={k} value={k}>{SERVICE_TYPES[k].label}</option>)}
          </Select>
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-36">
            <option value="all">全担当者</option>
            {users.filter((u) => u.role === "service" || u.role === "engineer").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Wrench size={20} />} title="該当するサービス記録がありません" />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>受付番号</th>
                  <th>件名</th>
                  <th>種別</th>
                  <th>対象装置</th>
                  <th>受付日</th>
                  <th>期限・完了</th>
                  <th>担当</th>
                  <th>請求</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const eq = lk.equipment.get(s.equipmentId);
                  return (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="cursor-pointer" onClick={() => router.push(`/service/${s.id}`)}>
                      <td className="font-num whitespace-nowrap text-xs font-semibold">{s.ticketNo}</td>
                      <td className="min-w-[220px]">
                        <div className="font-medium">{s.title}</div>
                        {s.linkedCaseId && <div className="text-[10px] text-violet-700">→ 案件化 {lk.case.get(s.linkedCaseId)?.dealNo}</div>}
                      </td>
                      <td><Badge className={SERVICE_TYPES[s.type].color}>{SERVICE_TYPES[s.type].label}</Badge></td>
                      <td>
                        <div className="font-num text-xs font-semibold text-emerald-700">{eq?.serialNo}</div>
                        <div className="text-[11px] text-stone-500">{lk.customer.get(eq?.customerId ?? "")?.name}</div>
                      </td>
                      <td className="font-num whitespace-nowrap text-xs">{fmtDate(s.reportedDate, false)}</td>
                      <td className="text-xs">{s.status === "done" ? <span className="font-num text-stone-500">完了 {fmtDate(s.completedDate, false)}</span> : <DueLabel date={s.dueDate} />}</td>
                      <td><span className="flex items-center gap-1.5 text-xs"><Avatar user={lk.user.get(s.assigneeId)} size={20} className="ring-0" />{lk.user.get(s.assigneeId)?.name}</span></td>
                      <td className="whitespace-nowrap text-xs">
                        {BILLING[s.billing]}
                        {s.amount > 0 && <div className={cn("font-num text-[11px] text-stone-500")}>{yen(s.amount)}</div>}
                      </td>
                      <td><Badge className={SERVICE_STATUS[s.status].color}>{SERVICE_STATUS[s.status].label}</Badge></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ServiceFormModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
