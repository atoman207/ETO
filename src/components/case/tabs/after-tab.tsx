"use client";

import Link from "next/link";
import { useState } from "react";
import { Cpu, Plus, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { daysFromToday, fmtDate } from "@/lib/format";
import { EQUIPMENT_STATUS } from "@/lib/constants";
import type { CaseTabProps } from "../tab-types";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ServiceFormModal } from "@/components/service/service-form-modal";
import { ServiceTimeline } from "@/components/service/service-timeline";

export function AfterTab({ c }: CaseTabProps) {
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const canService = useCan("editService");
  const lk = useLookups();
  const [open, setOpen] = useState(false);
  const eqs = equipment.filter((e) => e.caseId === c.id);
  const src = c.sourceEquipmentId ? lk.equipment.get(c.sourceEquipmentId) : undefined;
  const svcs = services.filter((s) => eqs.some((e) => e.id === s.equipmentId));
  const srcSvcs = src ? services.filter((s) => s.equipmentId === src.id) : [];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <CardHeader
            title="この案件で納入した装置"
            icon={<Cpu size={16} />}
            actions={
              canService &&
              eqs.length > 0 && (
                <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setOpen(true)}>
                  サービス受付
                </Button>
              )
            }
          />
          {eqs.length === 0 ? (
            <EmptyState icon={<Cpu size={20} />} title="まだ納入されていません" description="出荷・納品タブで納品完了を登録すると、製造番号付きで装置台帳に登録されます。" />
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {eqs.map((e) => {
                const left = daysFromToday(e.warrantyUntil) ?? 0;
                return (
                  <Link key={e.id} href={`/equipment/${e.id}`} className="rounded-lg border border-stone-200 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[var(--shadow-lift)]">
                    <div className="flex items-center justify-between">
                      <span className="font-num text-[13px] font-bold text-emerald-700">{e.serialNo}</span>
                      <Badge className={EQUIPMENT_STATUS[e.status].color} dot={EQUIPMENT_STATUS[e.status].dot}>
                        {EQUIPMENT_STATUS[e.status].label}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[13px] font-medium">{e.name}</div>
                    <div className="text-xs text-stone-500">{e.location}</div>
                    <div className="mt-2 flex justify-between text-[11px] text-stone-500">
                      <span>納入 {fmtDate(e.deliveredDate, false)}</span>
                      <span className={left > 0 ? "text-emerald-700" : ""}>{left > 0 ? `保証残 ${left}日` : "保証期間終了"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="修理・改造・部品交換の履歴" icon={<Wrench size={16} />} />
          <ServiceTimeline services={svcs} showEquipment={eqs.length > 1} />
        </Card>
      </div>
      <div className="space-y-4">
        {src && (
          <Card className="border-violet-200">
            <CardHeader title="改造・更新元の装置" description="既設装置の履歴を参照しながら仕様を検討できます" />
            <Link href={`/equipment/${src.id}`} className="block border-b border-stone-100 px-5 py-3 hover:bg-stone-50">
              <div className="font-num text-[12px] font-bold text-violet-700">{src.serialNo}</div>
              <div className="text-[13px] font-medium">{src.name}</div>
              <div className="text-[11px] text-stone-500">納入 {fmtDate(src.deliveredDate, false)}／{src.location}</div>
            </Link>
            <ServiceTimeline services={srcSvcs} />
          </Card>
        )}
      </div>
      <ServiceFormModal open={open} onClose={() => setOpen(false)} equipmentId={eqs[0]?.id} />
    </div>
  );
}
