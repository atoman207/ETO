"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Cpu, FilePlus2, ListTree, Pencil, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { bomChildren, daysFromToday, diffDays, fmtDate, matches, num, yen } from "@/lib/format";
import { EQUIPMENT_STATUS, EQUIPMENT_TYPES } from "@/lib/constants";
import type { EquipmentStatus } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, NumberTag } from "@/components/ui/badge";
import { DL, EmptyState, ProgressBar, PageHeader } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/form";
import { ServiceFormModal } from "@/components/service/service-form-modal";
import { ServiceTimeline } from "@/components/service/service-timeline";
import { DriveExplorer } from "@/components/docs/drive-explorer";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const e = useStore((s) => s.equipment.find((x) => x.id === id));
  const services = useStore((s) => s.services);
  const documents = useStore((s) => s.documents);
  const update = useStore((s) => s.updateEquipment);
  const canService = useCan("editService");
  const canCase = useCan("editCase");
  const showCost = useCan("viewCost");
  const lk = useLookups();
  const [svcOpen, setSvcOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [loc, setLoc] = useState("");
  const [pq, setPq] = useState("");

  const c = e ? lk.case.get(e.caseId) : undefined;
  const svcs = useMemo(() => services.filter((s) => s.equipmentId === id), [services, id]);
  const docs = useMemo(() => documents.filter((d) => d.caseId === e?.caseId && (d.folder.startsWith("06") || d.folder.startsWith("07") || d.folder.startsWith("03") || d.folder.startsWith("05"))), [documents, e]);

  if (!e) return <EmptyState icon={<Cpu size={20} />} title="装置が見つかりません" action={<Link href="/equipment" className="text-sm text-ai-700 underline">装置台帳へ</Link>} />;

  const warrantyTotal = Math.max(1, diffDays(e.warrantyUntil, e.deliveredDate));
  const warrantyLeft = daysFromToday(e.warrantyUntil) ?? 0;
  const repairs = svcs.filter((s) => s.type === "repair");
  const ageDays = Math.max(1, -(daysFromToday(e.deliveredDate) ?? 0));
  const mtbf = repairs.length ? Math.round(ageDays / repairs.length) : undefined;
  const totalAmount = svcs.reduce((s, x) => s + x.amount, 0);
  const roots = c ? bomChildren(c.bom, null) : [];
  const parentIds = new Set(c?.bom.map((b) => b.parentId).filter(Boolean));
  const leaves = c ? c.bom.filter((b) => !parentIds.has(b.id) && matches(pq, b.partNo, b.name, b.spec, b.maker)) : [];

  return (
    <div>
      <PageHeader
        title={e.name}
        description={`${lk.customer.get(e.customerId)?.name}　${e.location}`}
        icon={<Cpu size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "装置台帳", href: "/equipment" }, { label: e.serialNo }]}
        actions={
          <>
            {canCase && (
              <Button icon={<FilePlus2 size={15} />} onClick={() => router.push(`/cases/new?equipment=${e.id}`)}>
                更新・改造の引合を登録
              </Button>
            )}
            {canService && (
              <Button variant="accent" icon={<Wrench size={15} />} onClick={() => setSvcOpen(true)}>
                サービス受付
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {c && (
              <>
                <Link href={`/cases/${c.id}`}><NumberTag label="取引番号" value={c.dealNo} /></Link>
                <ArrowRight size={12} className="text-stone-300" />
                <Link href={`/cases/${c.id}`}><NumberTag label="工事番号" value={c.workNo} tone="shu" /></Link>
                <ArrowRight size={12} className="text-stone-300" />
              </>
            )}
            <NumberTag label="製造番号" value={e.serialNo} tone="emerald" />
            <ArrowRight size={12} className="text-stone-300" />
            <NumberTag label="サービス" value={`${svcs.length}件`} tone="violet" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">稼働状態</span>
            {canService ? (
              <Select
                value={e.status}
                onChange={(ev) => {
                  update(e.id, { status: ev.target.value as EquipmentStatus });
                  toast.success(`状態を「${EQUIPMENT_STATUS[ev.target.value as EquipmentStatus].label}」に変更しました`);
                }}
                className="h-8 w-36 text-xs"
              >
                {(Object.keys(EQUIPMENT_STATUS) as EquipmentStatus[]).map((k) => <option key={k} value={k}>{EQUIPMENT_STATUS[k].label}</option>)}
              </Select>
            ) : (
              <Badge className={EQUIPMENT_STATUS[e.status].color} dot={EQUIPMENT_STATUS[e.status].dot}>{EQUIPMENT_STATUS[e.status].label}</Badge>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader title="装置情報" actions={canService && <Button size="sm" icon={<Pencil size={13} />} onClick={() => { setLoc(e.location); setLocOpen(true); }}>設置場所を変更</Button>} />
            <CardBody>
              <DL
                cols={2}
                items={[
                  { label: "顧客", value: <Link href={`/customers/${e.customerId}`} className="text-ai-800 hover:underline">{lk.customer.get(e.customerId)?.name}</Link>, full: true },
                  { label: "拠点", value: lk.site.get(e.siteId)?.name },
                  { label: "設置場所", value: e.location },
                  { label: "装置種別", value: EQUIPMENT_TYPES[e.equipmentType].label },
                  { label: "型式", value: <span className="font-num">{e.model}</span> },
                  { label: "納入日", value: fmtDate(e.deliveredDate) },
                  { label: "保証期限", value: fmtDate(e.warrantyUntil) },
                ]}
              />
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[0.6875rem] text-stone-500">
                  <span>保証期間</span>
                  <span className={warrantyLeft >= 0 ? "text-emerald-700" : ""}>{warrantyLeft >= 0 ? `残り ${warrantyLeft}日` : "保証期間終了"}</span>
                </div>
                <ProgressBar value={Math.min(100, ((warrantyTotal - Math.max(0, warrantyLeft)) / warrantyTotal) * 100)} color={warrantyLeft >= 0 ? "bg-emerald-500" : "bg-stone-400"} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-num text-lg font-bold">{svcs.length}</div>
                <div className="text-[0.625rem] text-stone-500">サービス件数</div>
              </div>
              <div>
                <div className="font-num text-lg font-bold">{mtbf ? `${mtbf}日` : "—"}</div>
                <div className="text-[0.625rem] text-stone-500">平均故障間隔</div>
              </div>
              <div>
                <div className="font-num text-lg font-bold">{(totalAmount / 10000).toLocaleString()}万</div>
                <div className="text-[0.625rem] text-stone-500">サービス売上</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="納入時の仕様" description="納品時点のスナップショット" />
            <CardBody>
              <DL
                cols={2}
                items={[
                  { label: "処理能力", value: <span className="font-num font-bold">{num(e.specs.capacity)} {e.specs.capacityUnit}</span> },
                  { label: "外形寸法", value: <span className="font-num text-xs">{num(e.specs.width)}×{num(e.specs.depth)}×{num(e.specs.height)}</span> },
                  { label: "材質", value: e.specs.material },
                  { label: "制御", value: e.specs.control },
                  { label: "電源", value: e.specs.power },
                  { label: "環境", value: e.specs.environment },
                  { label: "対象ワーク", value: e.specs.workpiece, full: true },
                  ...e.specs.customFields.map((f) => ({ label: f.label, value: f.value, full: true })),
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="修理・改造・部品交換の履歴" icon={<Wrench size={16} />} />
            <ServiceTimeline services={svcs} />
          </Card>
          <Card>
            <CardHeader
              title="構成部品（納入時BOM）"
              description="交換部品の品番・メーカー・仕入先をすぐに特定できます"
              icon={<ListTree size={16} />}
              actions={
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input value={pq} onChange={(ev) => setPq(ev.target.value)} placeholder="部品を検索" className="h-8 w-48 pl-8 text-xs" />
                </div>
              }
            />
            {!c || c.bom.length === 0 ? (
              <EmptyState title="BOMデータがありません" />
            ) : (
              <div className="scroll-thin max-h-[380px] overflow-auto">
                <table className="tbl tbl-compact">
                  <thead>
                    <tr>
                      <th>ユニット</th>
                      <th>品番</th>
                      <th>品名・型式</th>
                      <th>メーカー</th>
                      <th className="text-right">数量</th>
                      <th>仕入先</th>
                      {showCost && <th className="text-right">単価</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((b) => (
                      <tr key={b.id}>
                        <td className="text-[0.6875rem] text-stone-500">{roots.find((r) => r.id === b.parentId)?.name ?? c.bom.find((x) => x.id === b.parentId)?.name ?? "—"}</td>
                        <td className="font-num text-xs">{b.partNo}</td>
                        <td>
                          <div className="text-[0.8125rem]">{b.name}</div>
                          <div className="text-[0.625rem] text-stone-400">{b.spec}</div>
                        </td>
                        <td className="text-xs">{b.maker}</td>
                        <td className="font-num text-right text-xs">{b.qty} {b.unit}</td>
                        <td className="text-[0.6875rem] text-stone-500">{b.supplierId ? lk.supplier.get(b.supplierId)?.name : "社内"}</td>
                        {showCost && <td className="font-num text-right text-xs">{yen(b.unitCost)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <DriveExplorer docs={docs} path={["共有ドライブ「案件」", c ? `${c.dealNo}_${c.title}` : "", "装置関連資料"]} caseId={e.caseId} equipmentId={e.id} />
        </div>
      </div>

      <ServiceFormModal open={svcOpen} onClose={() => setSvcOpen(false)} equipmentId={e.id} />
      <Modal
        open={locOpen}
        onClose={() => setLocOpen(false)}
        title="設置場所の変更"
        description="移設した場合などに更新してください（履歴に記録されます）"
        size="sm"
        footer={
          <>
            <Button onClick={() => setLocOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={() => { update(e.id, { location: loc }); toast.success("設置場所を更新しました"); setLocOpen(false); }}>保存</Button>
          </>
        }
      >
        <Field label="設置場所">
          <Input value={loc} onChange={(ev) => setLoc(ev.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
