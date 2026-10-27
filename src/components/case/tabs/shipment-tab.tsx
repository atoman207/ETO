"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Cpu, PackageCheck, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, fmtDate, today } from "@/lib/format";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS } from "@/lib/constants";

export function ShipmentTab({ c }: CaseTabProps) {
  const update = useStore((s) => s.updateShipment);
  const complete = useStore((s) => s.completeDelivery);
  const documents = useStore((s) => s.documents);
  const equipment = useStore((s) => s.equipment);
  const pos = useStore((s) => s.purchaseOrders);
  const canProd = useCan("editProduction");
  const canCase = useCan("editCase");
  const canEdit = canProd || canCase;
  const lk = useLookups();
  const router = useRouter();
  const [f, setF] = useState(c.shipment);
  const [open, setOpen] = useState(false);
  const [deliv, setDeliv] = useState({ date: today(), location: "" });
  useEffect(() => setF(c.shipment), [c.shipment]);

  if (!c.workNo) {
    return (
      <Card>
        <EmptyState icon={<Truck size={20} />} title="出荷・納品は工番発行後に管理できます" />
      </Card>
    );
  }

  const eqs = equipment.filter((e) => e.caseId === c.id);
  const docs = documents.filter((d) => d.caseId === c.id);
  const checks = [
    { label: "全部品の入荷完了", ok: pos.filter((p) => p.caseId === c.id && p.status !== "cancelled").every((p) => p.status === "received") && pos.some((p) => p.caseId === c.id) },
    { label: "社内検査の完了", ok: c.processes.find((p) => p.name === "社内検査")?.status === "done" },
    { label: "客先立会検査の実施", ok: !!f.inspectionDate && f.inspectionDate <= today() },
    { label: "社内検査成績書の作成", ok: docs.some((d) => d.kind === "inspection") },
    { label: "取扱説明書の準備", ok: docs.some((d) => d.kind === "manual") || c.stage === "delivery" },
    { label: "出荷日・運送手配の確定", ok: !!f.plannedShipDate && !!f.carrier },
  ];
  const done = c.stage === "aftercare";

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="出荷・納品情報"
          icon={<Truck size={16} />}
          actions={
            canEdit &&
            !done && (
              <Button size="sm" variant="primary" icon={<Save size={13} />} onClick={() => { update(c.id, f); toast.success("出荷・納品情報を保存しました"); }}>
                保存
              </Button>
            )
          }
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="出荷予定日">
              <Input type="date" value={f.plannedShipDate ?? ""} disabled={!canEdit || done} onChange={(e) => setF({ ...f, plannedShipDate: e.target.value })} />
            </Field>
            <Field label="客先立会検査日">
              <Input type="date" value={f.inspectionDate ?? ""} disabled={!canEdit || done} onChange={(e) => setF({ ...f, inspectionDate: e.target.value })} />
            </Field>
            <Field label="出荷日">
              <Input type="date" value={f.shippedDate ?? ""} disabled={!canEdit || done} onChange={(e) => setF({ ...f, shippedDate: e.target.value })} />
            </Field>
            <Field label="運送会社・車両">
              <Input value={f.carrier ?? ""} disabled={!canEdit || done} onChange={(e) => setF({ ...f, carrier: e.target.value })} placeholder="例：中部運輸（10tウイング車）" />
            </Field>
            <Field label="納品日">
              <Input type="date" value={f.deliveredDate ?? ""} disabled={!canEdit || done} onChange={(e) => setF({ ...f, deliveredDate: e.target.value })} />
            </Field>
            <Field label="検収日">
              <Input type="date" value={f.acceptanceDate ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, acceptanceDate: e.target.value })} />
            </Field>
            <Field label="納品書番号">
              <Input value={f.deliveryNoteNo ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, deliveryNoteNo: e.target.value })} />
            </Field>
            <Field label="納入場所" className="sm:col-span-2">
              <Input value={c.order?.deliveryPlace ?? ""} disabled />
            </Field>
            <Field label="備考（立会検査の指摘事項など）" className="sm:col-span-3">
              <Textarea rows={3} value={f.notes ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </Field>
          </div>
          {done && canEdit && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" icon={<Save size={13} />} onClick={() => { update(c.id, f); toast.success("保存しました"); }}>
                検収情報を保存
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="出荷前チェック" />
          <CardBody className="space-y-2">
            {checks.map((x) => (
              <div key={x.label} className="flex items-center gap-2 text-[0.8125rem]">
                {x.ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-stone-300" />}
                <span className={x.ok ? "text-stone-700" : "text-stone-500"}>{x.label}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        {done ? (
          <Card className="border-emerald-200">
            <CardHeader title="納品完了・装置台帳に登録済み" icon={<Cpu size={16} />} />
            <div>
              {eqs.map((e) => (
                <Link key={e.id} href={`/equipment/${e.id}`} className="block border-b border-stone-50 px-5 py-2.5 transition-colors last:border-0 hover:bg-stone-50">
                  <div className="flex items-center justify-between">
                    <span className="font-num text-[0.75rem] font-bold text-emerald-700">{e.serialNo}</span>
                    <Badge className={EQUIPMENT_STATUS[e.status].color}>{EQUIPMENT_STATUS[e.status].label}</Badge>
                  </div>
                  <div className="text-[0.8125rem]">{e.name}</div>
                  <div className="text-[0.6875rem] text-stone-500">納入 {fmtDate(e.deliveredDate, false)}／保証 {fmtDate(e.warrantyUntil, false)} まで</div>
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="border-shu-200">
            <CardBody>
              <div className="text-[0.8125rem] font-bold text-stone-800">納品完了の登録</div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                登録すると、製造番号（{c.workNo}-01〜）付きで装置台帳に自動登録され、仕様・BOMが紐付いた状態でアフターサービス管理が始まります。
              </p>
              <Button
                variant="accent"
                className="mt-3 w-full"
                icon={<PackageCheck size={15} />}
                disabled={!canEdit}
                onClick={() => {
                  setDeliv({ date: f.deliveredDate || today(), location: `${lk.site.get(c.siteId)?.name ?? ""}` });
                  setOpen(true);
                }}
              >
                納品完了を登録
              </Button>
            </CardBody>
          </Card>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="納品完了の登録"
        description={`${c.order?.quantity ?? 1}台分の装置を装置台帳に登録します`}
        icon={<PackageCheck size={16} />}
        size="sm"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>キャンセル</Button>
            <Button
              variant="accent"
              onClick={() => {
                update(c.id, { ...f, deliveredDate: deliv.date });
                const ids = complete(c.id, deliv.date, deliv.location || "—");
                setOpen(false);
                toast.success("納品を完了し、装置台帳に登録しました", { action: { label: "装置を開く", onClick: () => router.push(`/equipment/${ids[0]}`) } });
              }}
            >
              登録する
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="納品日" required>
            <Input type="date" value={deliv.date} onChange={(e) => setDeliv({ ...deliv, date: e.target.value })} />
          </Field>
          <Field label="設置場所" hint="例：本社工場 第2組立ライン">
            <Input value={deliv.location} onChange={(e) => setDeliv({ ...deliv, location: e.target.value })} />
          </Field>
          <div className={cn("rounded-md bg-stone-50 px-3 py-2 text-[0.6875rem] text-stone-600")}>保証期間は設定に基づき自動計算されます。実績原価はBOMの購入実績から集計されます。</div>
        </div>
      </Modal>
    </div>
  );
}
