"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, manYen, matches } from "@/lib/format";
import { INDUSTRIES } from "@/lib/constants";
import { PageHeader, Avatar, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { CustomerFormModal } from "@/components/customer/customer-form-modal";

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const cases = useStore((s) => s.cases);
  const equipment = useStore((s) => s.equipment);
  const canEdit = useCan("editCase");
  const lk = useLookups();
  const [q, setQ] = useState("");
  const [ind, setInd] = useState("all");
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      customers
        .filter((c) => (ind === "all" || c.industry === ind) && matches(q, c.name, c.kana, c.code, c.address))
        .map((c) => {
          const cs = cases.filter((x) => x.customerId === c.id);
          return {
            c,
            sites: sites.filter((s) => s.customerId === c.id),
            active: cs.filter((x) => x.status === "active").length,
            total: cs.filter((x) => x.order).reduce((s, x) => s + x.order!.orderAmount, 0),
            eq: equipment.filter((e) => e.customerId === c.id).length,
          };
        })
        .sort((a, b) => a.c.kana.localeCompare(b.c.kana, "ja")),
    [customers, sites, cases, equipment, q, ind],
  );

  return (
    <div>
      <PageHeader
        title="顧客・拠点"
        description="顧客 → 拠点（納入先）→ 案件 → 装置 を階層で管理します"
        icon={<Building2 size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "顧客・拠点" }]}
        actions={canEdit && <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>新規顧客を登録</Button>}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="顧客名・フリガナ・コード・住所" className="pl-9" />
          </div>
          <Select value={ind} onChange={(e) => setInd(e.target.value)} className="w-40">
            <option value="all">全業種</option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-stone-500">
            <span className="font-num font-bold text-stone-800">{rows.length}</span> 社（フリガナ順）
          </span>
        </div>
      </Card>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Search size={20} />} title="該当する顧客がありません" />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ c, sites: ss, active, total, eq }, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <Link href={`/customers/${c.id}`} className="group block h-full rounded-lg border border-stone-200 bg-surface p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-ai-300 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-num text-[0.6875rem] text-stone-400">{c.code}</div>
                    <div className="truncate text-[0.9375rem] font-bold text-stone-900 group-hover:text-ai-800">{c.name}</div>
                    <div className="text-[0.6875rem] text-stone-400">{c.kana}</div>
                  </div>
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold", c.creditRank === "A" ? "bg-emerald-50 text-emerald-700" : c.creditRank === "B" ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700")} title="与信ランク">
                    {c.creditRank}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge>{c.industry}</Badge>
                  {ss.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-0.5 rounded-sm bg-stone-50 px-1.5 text-[0.6875rem] text-stone-600 ring-1 ring-stone-200">
                      <MapPin size={10} />
                      {s.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
                  <div>
                    <div className="font-num text-[0.9375rem] font-bold">{active}</div>
                    <div className="text-[0.625rem] text-stone-500">進行中案件</div>
                  </div>
                  <div>
                    <div className="font-num text-[0.9375rem] font-bold">{eq}</div>
                    <div className="text-[0.625rem] text-stone-500">納入装置</div>
                  </div>
                  <div>
                    <div className="font-num text-[0.9375rem] font-bold">{manYen(total)}</div>
                    <div className="text-[0.625rem] text-stone-500">累計受注</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-stone-500">
                  <Avatar user={lk.user.get(c.salesRepId)} size={18} className="ring-0" />
                  担当：{lk.user.get(c.salesRepId)?.name}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
      <CustomerFormModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
