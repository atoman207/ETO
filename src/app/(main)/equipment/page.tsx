"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Cpu, Download, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { cn, daysFromToday, fmtDate, matches } from "@/lib/format";
import { EQUIPMENT_STATUS, EQUIPMENT_TYPES, EQUIPMENT_TYPE_KEYS } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import type { EquipmentStatus } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

export default function EquipmentPage() {
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const customers = useStore((s) => s.customers);
  const lk = useLookups();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cust, setCust] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [warranty, setWarranty] = useState("all");

  const rows = useMemo(
    () =>
      equipment
        .filter((e) => {
          if (cust !== "all" && e.customerId !== cust) return false;
          if (type !== "all" && e.equipmentType !== type) return false;
          if (status !== "all" && e.status !== status) return false;
          const left = daysFromToday(e.warrantyUntil) ?? 0;
          if (warranty === "in" && left < 0) return false;
          if (warranty === "out" && left >= 0) return false;
          return matches(q, e.serialNo, e.name, e.workNo, e.location, lk.customer.get(e.customerId)?.name);
        })
        .map((e) => {
          const sv = services.filter((s) => s.equipmentId === e.id).sort((a, b) => b.reportedDate.localeCompare(a.reportedDate));
          return { e, sv, open: sv.filter((s) => s.status !== "done").length };
        })
        .sort((a, b) => b.e.deliveredDate.localeCompare(a.e.deliveredDate)),
    [equipment, services, q, cust, type, status, warranty, lk],
  );

  const counts = (Object.keys(EQUIPMENT_STATUS) as EquipmentStatus[]).map((k) => ({ k, n: equipment.filter((e) => e.status === k).length }));

  return (
    <div>
      <PageHeader
        title="装置台帳（納入実績）"
        description="納入した装置を製造番号単位で管理。仕様・構成部品・サービス履歴を装置ごとに追跡できます"
        icon={<Cpu size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "装置台帳" }]}
        actions={
          <Button
            icon={<Download size={15} />}
            onClick={() =>
              downloadCsv(
                "装置台帳.csv",
                ["製造番号", "工事番号", "装置名", "装置種別", "顧客", "拠点", "設置場所", "納入日", "保証期限", "状態", "サービス件数"],
                rows.map(({ e, sv }) => [e.serialNo, e.workNo, e.name, EQUIPMENT_TYPES[e.equipmentType].label, lk.customer.get(e.customerId)?.name, lk.site.get(e.siteId)?.name, e.location, e.deliveredDate, e.warrantyUntil, EQUIPMENT_STATUS[e.status].label, sv.length]),
              )
            }
          >
            CSV出力
          </Button>
        }
      />
      <div className="stagger mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {counts.map(({ k, n }) => (
          <button key={k} onClick={() => setStatus(status === k ? "all" : k)} className={cn("rounded-lg border bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5", status === k ? "border-ai-500 ring-2 ring-ai-500/15" : "border-stone-200")}>
            <div className="flex items-center gap-1.5 text-[0.6875rem] text-stone-500">
              <span className={cn("h-2 w-2 rounded-full", EQUIPMENT_STATUS[k].dot)} />
              {EQUIPMENT_STATUS[k].label}
            </div>
            <div className="font-num text-xl font-bold">{n}<span className="ml-0.5 text-xs font-normal text-stone-500">台</span></div>
          </button>
        ))}
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="製造番号・工番・装置名・設置場所" className="pl-9" />
          </div>
          <Select value={cust} onChange={(e) => setCust(e.target.value)} className="w-48">
            <option value="all">全顧客</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36">
            <option value="all">全装置種別</option>
            {EQUIPMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{EQUIPMENT_TYPES[k].label}</option>)}
          </Select>
          <Select value={warranty} onChange={(e) => setWarranty(e.target.value)} className="w-36">
            <option value="all">保証：すべて</option>
            <option value="in">保証期間内</option>
            <option value="out">保証期間外</option>
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Cpu size={20} />} title="該当する装置がありません" />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>製造番号</th>
                  <th>装置名</th>
                  <th>顧客・設置場所</th>
                  <th>納入日</th>
                  <th>保証</th>
                  <th>状態</th>
                  <th className="text-right">サービス履歴</th>
                  <th>直近の対応</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, sv, open }, i) => {
                  const left = daysFromToday(e.warrantyUntil) ?? 0;
                  return (
                    <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="cursor-pointer" onClick={() => router.push(`/equipment/${e.id}`)}>
                      <td className="whitespace-nowrap">
                        <div className="font-num text-[0.8125rem] font-bold text-emerald-700">{e.serialNo}</div>
                        <div className="text-[0.625rem] text-stone-400">{EQUIPMENT_TYPES[e.equipmentType].label}</div>
                      </td>
                      <td className="font-medium">{e.name}</td>
                      <td>
                        <div className="text-[0.8125rem]">{lk.customer.get(e.customerId)?.name}</div>
                        <div className="text-[0.6875rem] text-stone-500">{e.location}</div>
                      </td>
                      <td className="font-num whitespace-nowrap text-xs">{fmtDate(e.deliveredDate, false)}</td>
                      <td className="whitespace-nowrap">
                        {left >= 0 ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">保証内（残{left}日）</Badge> : <span className="text-[0.6875rem] text-stone-400">期間外</span>}
                      </td>
                      <td>
                        <Badge className={EQUIPMENT_STATUS[e.status].color} dot={EQUIPMENT_STATUS[e.status].dot}>{EQUIPMENT_STATUS[e.status].label}</Badge>
                      </td>
                      <td className="font-num text-right text-xs">
                        {sv.length}件{open > 0 && <span className="ml-1 rounded-sm bg-shu-500 px-1 text-[0.625rem] text-white">対応中{open}</span>}
                      </td>
                      <td className="max-w-[220px] truncate text-xs text-stone-600">{sv[0] ? `${fmtDate(sv[0].reportedDate, false)} ${sv[0].title}` : "—"}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
