"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCurrentUser, useLookups } from "@/lib/hooks";
import { addDays, fmtDate, today } from "@/lib/format";
import { BILLING, SERVICE_TYPES } from "@/lib/constants";
import type { Billing, ServiceType } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function ServiceFormModal({ open, onClose, equipmentId }: { open: boolean; onClose: () => void; equipmentId?: string }) {
  const equipment = useStore((s) => s.equipment);
  const users = useStore((s) => s.users);
  const create = useStore((s) => s.createService);
  const me = useCurrentUser();
  const lk = useLookups();
  const router = useRouter();
  const [f, setF] = useState({
    equipmentId: equipmentId ?? "",
    type: "repair" as ServiceType,
    title: "",
    description: "",
    reportedDate: today(),
    dueDate: addDays(today(), 7),
    assigneeId: "u09",
    billing: "paid" as Billing,
    reporter: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setF((p) => ({ ...p, equipmentId: equipmentId ?? p.equipmentId, title: "", description: "", reporter: "", reportedDate: today(), dueDate: addDays(today(), 7), assigneeId: me?.role === "service" ? me.id : "u09" }));
      setErr({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipmentId]);

  const eq = equipment.find((e) => e.id === f.equipmentId);
  const inWarranty = eq ? eq.warrantyUntil >= f.reportedDate : false;
  useEffect(() => {
    if (!eq) return;
    setF((p) => ({ ...p, billing: inWarranty && (p.type === "repair" || p.type === "inspection") ? "warranty" : p.type === "inquiry" ? "free" : "paid" }));
  }, [eq, inWarranty, f.type]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof equipment>();
    equipment.forEach((e) => m.set(e.customerId, [...(m.get(e.customerId) ?? []), e]));
    return [...m.entries()];
  }, [equipment]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.equipmentId) e.equipmentId = "対象装置を選択してください";
    if (!f.title.trim()) e.title = "件名を入力してください";
    setErr(e);
    if (Object.keys(e).length) return;
    const id = create({ ...f, title: f.title.trim(), cause: "", action: "", laborHours: 0, amount: 0, parts: [] });
    toast.success("サービスを受け付けました", { description: "担当者に通知しました", action: { label: "詳細を開く", onClick: () => router.push(`/service/${id}`) } });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="アフターサービスの受付"
      description="修理・改造・部品交換・点検の依頼を装置単位で記録します"
      icon={<Wrench size={16} />}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="primary" onClick={submit}>
            受け付ける
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="対象装置（製造番号）" required error={err.equipmentId} className="sm:col-span-2">
          <Select value={f.equipmentId} onChange={(e) => setF({ ...f, equipmentId: e.target.value })}>
            <option value="">選択してください</option>
            {grouped.map(([cid, list]) => (
              <optgroup key={cid} label={lk.customer.get(cid)?.name}>
                {list.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.serialNo}　{x.name}（{lk.site.get(x.siteId)?.name}）
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        {eq && (
          <div className="rounded-md bg-kinari px-3 py-2 text-xs text-stone-600 sm:col-span-2">
            設置場所：{eq.location}　納入日：{fmtDate(eq.deliveredDate, false)}　保証期限：
            <span className={inWarranty ? "font-bold text-emerald-700" : "text-stone-700"}>
              {fmtDate(eq.warrantyUntil, false)}（{inWarranty ? "保証期間内" : "保証期間外"}）
            </span>
          </div>
        )}
        <Field label="種別" required>
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ServiceType })}>
            {(Object.keys(SERVICE_TYPES) as ServiceType[]).map((t) => (
              <option key={t} value={t}>
                {SERVICE_TYPES[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="請求区分">
          <Select value={f.billing} onChange={(e) => setF({ ...f, billing: e.target.value as Billing })}>
            {(Object.keys(BILLING) as Billing[]).map((b) => (
              <option key={b} value={b}>
                {BILLING[b]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="件名" required error={err.title} className="sm:col-span-2">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="例：搬送ベルトの蛇行" />
        </Field>
        <Field label="依頼内容・症状" className="sm:col-span-2">
          <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="発生日時、症状、アラーム内容、稼働への影響など" />
        </Field>
        <Field label="ご依頼者">
          <Input value={f.reporter} onChange={(e) => setF({ ...f, reporter: e.target.value })} placeholder="例：保全課 石井様" />
        </Field>
        <Field label="担当">
          <Select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
            {users
              .filter((u) => u.role === "service" || u.role === "engineer")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}（{u.dept}）
                </option>
              ))}
          </Select>
        </Field>
        <Field label="受付日">
          <Input type="date" value={f.reportedDate} onChange={(e) => setF({ ...f, reportedDate: e.target.value })} />
        </Field>
        <Field label="対応期限">
          <Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
