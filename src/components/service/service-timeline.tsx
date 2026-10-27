"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLookups } from "@/lib/hooks";
import { cn, fmtDate } from "@/lib/format";
import { BILLING, SERVICE_STATUS, SERVICE_TYPES } from "@/lib/constants";
import type { ServiceRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";

export function ServiceTimeline({ services, showEquipment }: { services: ServiceRecord[]; showEquipment?: boolean }) {
  const lk = useLookups();
  const list = [...services].sort((a, b) => b.reportedDate.localeCompare(a.reportedDate));
  if (list.length === 0) return <div className="px-5 py-8 text-center text-xs text-stone-500">サービス履歴はありません</div>;
  return (
    <ol className="relative px-5 py-4">
      {list.map((s, i) => {
        const eq = lk.equipment.get(s.equipmentId);
        const dot = { repair: "bg-rose-500", modification: "bg-violet-500", parts: "bg-amber-500", inspection: "bg-sky-500", inquiry: "bg-stone-400" }[s.type];
        return (
          <motion.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex gap-4 pb-5 last:pb-0">
            {i < list.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-stone-200" />}
            <span className={cn("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-surface", dot)} />
            <Link href={`/service/${s.id}`} className="-mx-2 -my-1 min-w-0 flex-1 rounded-md px-2 py-1 transition-colors hover:bg-stone-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-num text-[0.6875rem] text-stone-500">{fmtDate(s.reportedDate, false)}</span>
                <Badge className={SERVICE_TYPES[s.type].color}>{SERVICE_TYPES[s.type].label}</Badge>
                <Badge className={SERVICE_STATUS[s.status].color}>{SERVICE_STATUS[s.status].label}</Badge>
                <span className="text-[0.6875rem] text-stone-400">{BILLING[s.billing]}</span>
                <span className="font-num ml-auto text-[0.6875rem] text-stone-400">{s.ticketNo}</span>
              </div>
              <div className="mt-0.5 text-[0.8125rem] font-medium text-stone-800">{s.title}</div>
              {showEquipment && eq && <div className="font-num text-[0.6875rem] text-emerald-700">{eq.serialNo} {eq.name}</div>}
              {s.cause && s.cause !== "—" && <div className="mt-0.5 text-xs text-stone-600">原因：{s.cause}</div>}
              {s.action && <div className="text-xs text-stone-600">処置：{s.action}</div>}
              {s.parts.length > 0 && <div className="mt-0.5 text-[0.6875rem] text-stone-500">使用部品：{s.parts.map((p) => `${p.name}×${p.qty}`).join("、")}</div>}
              <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-stone-500">
                <Avatar user={lk.user.get(s.assigneeId)} size={16} className="ring-0" />
                {lk.user.get(s.assigneeId)?.name}
                {s.linkedCaseId && <span className="ml-2 rounded-sm bg-violet-50 px-1.5 text-violet-700 ring-1 ring-violet-200">案件化：{lk.case.get(s.linkedCaseId)?.dealNo}</span>}
              </div>
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
