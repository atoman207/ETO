"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Cpu, FilePlus2, Plus, Save, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, fmtDate, today, uid, yen } from "@/lib/format";
import { BILLING, SERVICE_STATUS, SERVICE_TYPES } from "@/lib/constants";
import type { Billing, ServiceRecord, ServiceStatus, ServiceType } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { ServiceTimeline } from "@/components/service/service-timeline";

const FLOW: ServiceStatus[] = ["received", "in_progress", "waiting_parts", "done"];

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore((st) => st.services.find((x) => x.id === id));
  const services = useStore((st) => st.services);
  const parts = useStore((st) => st.parts);
  const users = useStore((st) => st.users);
  const update = useStore((st) => st.updateService);
  const convert = useStore((st) => st.convertServiceToCase);
  const canEdit = useCan("editService");
  const canCase = useCan("editCase");
  const lk = useLookups();
  const [f, setF] = useState<ServiceRecord | undefined>(s);
  const [partSel, setPartSel] = useState("");
  const [partQty, setPartQty] = useState(1);
  useEffect(() => setF(s), [s]);

  if (!s || !f) return <EmptyState icon={<Wrench size={20} />} title="サービス記録が見つかりません" action={<Link href="/service" className="text-sm text-ai-700 underline">一覧へ</Link>} />;
  const eq = lk.equipment.get(s.equipmentId);
  const c = eq ? lk.case.get(eq.caseId) : undefined;
  const dirty = JSON.stringify(f) !== JSON.stringify(s);
  const partsTotal = f.parts.reduce((t, p) => t + p.qty * p.unitPrice, 0);
  const others = services.filter((x) => x.equipmentId === s.equipmentId && x.id !== s.id);
  const curIdx = FLOW.indexOf(s.status);

  const save = (patch?: Partial<ServiceRecord>) => {
    update(s.id, { ...f, ...patch });
    toast.success(patch?.status === "done" ? "対応完了として登録しました" : "保存しました", patch?.status === "done" ? { description: "サービス報告書を Drive に保存しました" } : undefined);
  };

  return (
    <div>
      <PageHeader
        title={s.title}
        description={`${s.ticketNo}　${lk.customer.get(eq?.customerId ?? "")?.name ?? ""}`}
        icon={<Wrench size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "アフターサービス", href: "/service" }, { label: s.ticketNo }]}
        actions={
          <>
            {canEdit && (
              <Button icon={<Save size={14} />} disabled={!dirty} onClick={() => save()}>
                保存
              </Button>
            )}
            {canEdit && s.status !== "done" && (
              <Button
                variant="success"
                icon={<CheckCircle2 size={15} />}
                onClick={() => {
                  if (!f.action.trim()) return toast.error("処置内容を入力してください");
                  save({ status: "done", completedDate: f.completedDate ?? today() });
                }}
              >
                対応完了にする
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center">
            {FLOW.map((st, i) => {
              const done = i < curIdx || s.status === "done";
              const cur = i === curIdx && s.status !== "done";
              return (
                <div key={st} className="flex flex-1 items-center">
                  <button
                    disabled={!canEdit}
                    onClick={() => {
                      if (st === "done") {
                        if (!f.action.trim()) return toast.error("処置内容を入力してから完了にしてください");
                        save({ status: "done", completedDate: today() });
                      } else {
                        update(s.id, { ...f, status: st, completedDate: undefined });
                        toast.success(`状態を「${SERVICE_STATUS[st].label}」に変更しました`);
                      }
                    }}
                    className="flex items-center gap-2 disabled:cursor-default"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: cur ? 1.1 : 1 }}
                      className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold", done ? "border-ai-600 bg-ai-600 text-white" : cur ? "border-shu-500 bg-shu-500 text-white" : "border-stone-300 bg-surface text-stone-400")}
                    >
                      {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </motion.span>
                    <span className={cn("text-[0.8125rem]", cur ? "font-bold text-shu-700" : done ? "text-ai-800" : "text-stone-400")}>{SERVICE_STATUS[st].label}</span>
                  </button>
                  {i < FLOW.length - 1 && <div className={cn("mx-3 h-[2px] flex-1 rounded-sm", i < curIdx || s.status === "done" ? "bg-ai-600" : "bg-stone-200")} />}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="受付・対応内容" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="件名" className="sm:col-span-3">
                  <Input value={f.title} disabled={!canEdit} onChange={(e) => setF({ ...f, title: e.target.value })} />
                </Field>
                <Field label="種別">
                  <Select value={f.type} disabled={!canEdit} onChange={(e) => setF({ ...f, type: e.target.value as ServiceType })}>
                    {(Object.keys(SERVICE_TYPES) as ServiceType[]).map((k) => <option key={k} value={k}>{SERVICE_TYPES[k].label}</option>)}
                  </Select>
                </Field>
                <Field label="担当">
                  <Select value={f.assigneeId} disabled={!canEdit} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
                    {users.filter((u) => u.role === "service" || u.role === "engineer").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </Field>
                <Field label="ご依頼者">
                  <Input value={f.reporter} disabled={!canEdit} onChange={(e) => setF({ ...f, reporter: e.target.value })} />
                </Field>
                <Field label="受付日">
                  <Input type="date" value={f.reportedDate} disabled={!canEdit} onChange={(e) => setF({ ...f, reportedDate: e.target.value })} />
                </Field>
                <Field label="対応期限">
                  <Input type="date" value={f.dueDate ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
                </Field>
                <Field label="完了日">
                  <Input type="date" value={f.completedDate ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, completedDate: e.target.value || undefined })} />
                </Field>
                <Field label="依頼内容・症状" className="sm:col-span-3">
                  <Textarea rows={3} value={f.description} disabled={!canEdit} onChange={(e) => setF({ ...f, description: e.target.value })} />
                </Field>
                <Field label="原因" className="sm:col-span-3">
                  <Textarea rows={2} value={f.cause} disabled={!canEdit} onChange={(e) => setF({ ...f, cause: e.target.value })} placeholder="調査結果・推定原因" />
                </Field>
                <Field label="処置内容" className="sm:col-span-3" required>
                  <Textarea rows={3} value={f.action} disabled={!canEdit} onChange={(e) => setF({ ...f, action: e.target.value })} placeholder="実施した処置、再発防止策、客先への説明内容" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="使用部品・費用" />
            <div className="overflow-x-auto">
              <table className="tbl tbl-compact">
                <thead>
                  <tr>
                    <th>品番</th>
                    <th>品名</th>
                    <th className="w-24 text-right">数量</th>
                    <th className="w-32 text-right">販売単価</th>
                    <th className="w-32 text-right">金額</th>
                    {canEdit && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {f.parts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-xs text-stone-400">使用部品はありません</td>
                    </tr>
                  )}
                  {f.parts.map((p) => (
                    <tr key={p.id}>
                      <td className="font-num text-xs">{p.partNo}</td>
                      <td className="text-[0.8125rem]">{p.name}</td>
                      <td><NumberInput compact value={p.qty} disabled={!canEdit} onChange={(v) => setF({ ...f, parts: f.parts.map((x) => (x.id === p.id ? { ...x, qty: v } : x)) })} /></td>
                      <td><NumberInput compact value={p.unitPrice} disabled={!canEdit} onChange={(v) => setF({ ...f, parts: f.parts.map((x) => (x.id === p.id ? { ...x, unitPrice: v } : x)) })} /></td>
                      <td className="font-num text-right text-xs">{yen(p.qty * p.unitPrice)}</td>
                      {canEdit && (
                        <td>
                          <IconButton label="削除" className="h-6 w-6" onClick={() => setF({ ...f, parts: f.parts.filter((x) => x.id !== p.id) })}>
                            <Trash2 size={13} />
                          </IconButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardBody className="border-t border-stone-100">
              {canEdit && (
                <div className="mb-4 flex flex-wrap items-end gap-2">
                  <Field label="部品を追加（装置のBOM・品目マスタから選択）" className="min-w-[300px] flex-1">
                    <Select value={partSel} onChange={(e) => setPartSel(e.target.value)}>
                      <option value="">選択してください</option>
                      {c && c.bom.length > 0 && (
                        <optgroup label="この装置の構成部品">
                          {Array.from(new Map(c.bom.filter((b) => b.partNo && !c.bom.some((x) => x.parentId === b.id)).map((b) => [b.partNo, b])).values()).map((b) => (
                            <option key={`bom-${b.id}`} value={`p:${b.partNo}`}>{b.partNo}　{b.name}（{b.spec}）</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="品目マスタ">
                        {parts.map((p) => <option key={p.id} value={`p:${p.partNo}`}>{p.partNo}　{p.name}</option>)}
                      </optgroup>
                    </Select>
                  </Field>
                  <Field label="数量" className="w-24">
                    <NumberInput value={partQty} onChange={(v) => setPartQty(Math.max(1, v))} min={1} />
                  </Field>
                  <Button
                    icon={<Plus size={14} />}
                    disabled={!partSel}
                    onClick={() => {
                      const pn = partSel.slice(2);
                      const p = parts.find((x) => x.partNo === pn);
                      const b = c?.bom.find((x) => x.partNo === pn);
                      const name = p?.name ?? b?.name ?? pn;
                      const cost = p?.standardCost ?? b?.unitCost ?? 0;
                      setF({ ...f, parts: [...f.parts, { id: uid("sp"), partNo: pn, name, qty: partQty, unitPrice: Math.round((cost * 1.35) / 100) * 100 }] });
                      setPartSel("");
                      setPartQty(1);
                    }}
                  >
                    追加
                  </Button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="請求区分">
                  <Select value={f.billing} disabled={!canEdit} onChange={(e) => setF({ ...f, billing: e.target.value as Billing })}>
                    {(Object.keys(BILLING) as Billing[]).map((b) => <option key={b} value={b}>{BILLING[b]}</option>)}
                  </Select>
                </Field>
                <Field label="作業工数">
                  <NumberInput value={f.laborHours} disabled={!canEdit} onChange={(v) => setF({ ...f, laborHours: v })} suffix="h" />
                </Field>
                <Field label="部品代（参考）">
                  <Input value={yen(partsTotal)} disabled />
                </Field>
                <Field label="請求金額（税抜）" hint={f.billing === "paid" ? `目安：部品代＋工数×8,000円 ＝ ${yen(partsTotal + f.laborHours * 8000)}` : "保証内・無償のため請求なし"}>
                  <NumberInput value={f.amount} disabled={!canEdit || f.billing !== "paid"} onChange={(v) => setF({ ...f, amount: v })} suffix="円" />
                </Field>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {eq && (
            <Card>
              <CardHeader title="対象装置" icon={<Cpu size={16} />} />
              <Link href={`/equipment/${eq.id}`} className="block px-5 py-3 transition-colors hover:bg-stone-50">
                <div className="font-num text-[0.8125rem] font-bold text-emerald-700">{eq.serialNo}</div>
                <div className="text-[0.8125rem] font-medium">{eq.name}</div>
                <div className="text-[0.6875rem] text-stone-500">{lk.customer.get(eq.customerId)?.name}／{eq.location}</div>
                <div className="mt-1 text-[0.6875rem] text-stone-500">
                  納入 {fmtDate(eq.deliveredDate, false)}／保証 {fmtDate(eq.warrantyUntil, false)}
                  {eq.warrantyUntil >= s.reportedDate ? <Badge className="ml-1 bg-emerald-50 text-emerald-700 ring-emerald-200">保証内</Badge> : <Badge className="ml-1">保証外</Badge>}
                </div>
              </Link>
              {c && (
                <Link href={`/cases/${c.id}`} className="flex items-center justify-between border-t border-stone-100 px-5 py-2.5 text-xs text-ai-800 hover:bg-stone-50">
                  元案件 {c.workNo} {c.title}
                  <ArrowRight size={13} />
                </Link>
              )}
            </Card>
          )}

          {(s.type === "modification" || s.type === "inquiry" || s.type === "repair") && (
            <Card className={s.linkedCaseId ? "border-violet-200" : "border-shu-200"}>
              <CardBody>
                {s.linkedCaseId ? (
                  <>
                    <div className="text-[0.8125rem] font-bold text-violet-800">案件化済み</div>
                    <Link href={`/cases/${s.linkedCaseId}`} className="mt-1 flex items-center justify-between rounded-md bg-violet-50 px-3 py-2 text-[0.8125rem] text-violet-800 hover:bg-violet-100">
                      <span>
                        <span className="font-num mr-1.5 text-xs font-bold">{lk.case.get(s.linkedCaseId)?.dealNo}</span>
                        {lk.case.get(s.linkedCaseId)?.title}
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="text-[0.8125rem] font-bold text-stone-800">改造・更新の案件として登録</div>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">装置の仕様・元案件・顧客情報を引き継いで引合を登録します。営業への引継ぎ漏れを防ぎます。</p>
                    <Button
                      variant="accent"
                      className="mt-3 w-full"
                      icon={<FilePlus2 size={14} />}
                      disabled={!canCase && !canEdit}
                      onClick={() => {
                        const cid = convert(s.id);
                        toast.success("改造案件として引合を登録しました");
                        router.push(`/cases/${cid}`);
                      }}
                    >
                      案件化する
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="この装置の他のサービス履歴" />
            <ServiceTimeline services={others} />
          </Card>
        </div>
      </div>
    </div>
  );
}
