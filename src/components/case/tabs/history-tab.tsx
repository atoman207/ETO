"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/format";
import type { CaseTabProps } from "../tab-types";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

const ENTITY_LABEL: Record<string, string> = { case: "案件", quote: "見積", bom: "BOM", po: "購買", service: "サービス", doc: "資料", equipment: "装置", customer: "顧客", master: "マスタ" };

export function HistoryTab({ c }: CaseTabProps) {
  const activities = useStore((s) => s.activities);
  const lk = useLookups();
  const list = useMemo(() => activities.filter((a) => a.caseId === c.id).sort((a, b) => b.at.localeCompare(a.at)), [activities, c.id]);
  const byDay = useMemo(() => {
    const m = new Map<string, typeof list>();
    list.forEach((a) => {
      const d = fmtDateTime(a.at).slice(0, 10);
      m.set(d, [...(m.get(d) ?? []), a]);
    });
    return [...m.entries()];
  }, [list]);

  return (
    <Card>
      <CardHeader title="操作履歴（監査ログ）" description="誰が・いつ・何をしたかをすべて記録しています。引継ぎ時の経緯確認にご活用ください。" />
      {list.length === 0 ? (
        <EmptyState title="履歴はありません" />
      ) : (
        <div className="px-5 py-4">
          {byDay.map(([day, items]) => (
            <div key={day} className="mb-4 last:mb-0">
              <div className="font-num sticky top-14 mb-2 inline-block rounded-sm bg-stone-100 px-2 py-0.5 text-[0.6875rem] font-medium text-stone-600">{day}</div>
              <div className="space-y-2 border-l border-stone-200 pl-4">
                {items.map((a) => {
                  const u = lk.user.get(a.userId);
                  return (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <Avatar user={u} size={22} className="ring-0" />
                      <div className="min-w-0 flex-1 text-[0.8125rem]">
                        <span className="font-medium">{u?.name}</span>
                        <span className="ml-1 text-[0.6875rem] text-stone-400">{u?.dept}</span>
                        <div className="text-stone-700">{a.message}</div>
                      </div>
                      <Badge>{ENTITY_LABEL[a.entity] ?? a.entity}</Badge>
                      <span className="font-num w-12 shrink-0 text-right text-[0.6875rem] text-stone-400">{fmtDateTime(a.at).slice(11)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
