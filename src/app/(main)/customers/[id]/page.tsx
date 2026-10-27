"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, Cpu, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserPlus, Briefcase, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { fmtDate, manYen, yen } from "@/lib/format";
import { EQUIPMENT_STATUS, EQUIPMENT_TYPES, INDUSTRIES } from "@/lib/constants";
import type { Customer, Site } from "@/lib/types";
import { PageHeader, DL, EmptyState, UserChip } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, StageBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { ServiceTimeline } from "@/components/service/service-timeline";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const c = useStore((s) => s.customers.find((x) => x.id === id));
  const sitesAll = useStore((s) => s.sites);
  const cases = useStore((s) => s.cases);
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const removeContact = useStore((s) => s.removeContact);
  const canEdit = useCan("editCase");
  const lk = useLookups();
  const [tab, setTab] = useState<"cases" | "equipment" | "service">("cases");
  const [editOpen, setEditOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [contactSite, setContactSite] = useState<Site | null>(null);

  const data = useMemo(() => {
    if (!c) return null;
    const cs = cases.filter((x) => x.customerId === c.id).sort((a, b) => b.inquiryDate.localeCompare(a.inquiryDate));
    const eqs = equipment.filter((e) => e.customerId === c.id);
    const svcs = services.filter((s) => eqs.some((e) => e.id === s.equipmentId));
    const orders = cs.filter((x) => x.order);
    return { cs, eqs, svcs, total: orders.reduce((s, x) => s + x.order!.orderAmount, 0), won: orders.length, lost: cs.filter((x) => x.status === "lost").length };
  }, [c, cases, equipment, services]);

  if (!c || !data) return <EmptyState title="顧客が見つかりません" action={<Link href="/customers" className="text-sm text-ai-700 underline">顧客一覧へ</Link>} />;
  const sites = sitesAll.filter((s) => s.customerId === c.id);

  return (
    <div>
      <PageHeader
        title={c.name}
        description={`${c.code}　${c.kana}　${c.industry}`}
        icon={<Building2 size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "顧客・拠点", href: "/customers" }, { label: c.name }]}
        actions={
          canEdit && (
            <>
              <Button icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
                顧客情報を編集
              </Button>
              <Button variant="accent" icon={<Plus size={15} />} onClick={() => router.push(`/cases/new?customer=${c.id}`)}>
                この顧客で引合登録
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader title="基本情報" />
            <CardBody>
              <DL
                cols={2}
                items={[
                  { label: "所在地", value: c.address, full: true },
                  { label: "電話番号", value: c.phone },
                  { label: "業種", value: c.industry },
                  { label: "与信ランク", value: <span className={c.creditRank === "C" || c.creditRank === "D" ? "font-bold text-rose-700" : "font-bold"}>{c.creditRank}</span> },
                  { label: "与信限度額", value: <span className="font-num">{yen(c.creditLimit)}</span> },
                  { label: "支払条件", value: c.paymentTerms, full: true },
                  { label: "営業担当", value: <UserChip user={lk.user.get(c.salesRepId)} /> },
                  { label: "取引開始", value: fmtDate(c.createdAt.slice(0, 10), false) },
                  { label: "メモ", value: <span className="whitespace-pre-wrap">{c.notes || "—"}</span>, full: true },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-num text-lg font-bold">{manYen(data.total)}</div>
                <div className="text-[0.625rem] text-stone-500">累計受注額</div>
              </div>
              <div>
                <div className="font-num text-lg font-bold">{data.won}件</div>
                <div className="text-[0.625rem] text-stone-500">受注件数</div>
              </div>
              <div>
                <div className="font-num text-lg font-bold">{data.won + data.lost ? Math.round((data.won / (data.won + data.lost)) * 100) : 0}%</div>
                <div className="text-[0.625rem] text-stone-500">受注率</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={`拠点・ご担当者（${sites.length}拠点）`} icon={<MapPin size={16} />} actions={canEdit && <Button size="sm" icon={<Plus size={13} />} onClick={() => setSiteOpen(true)}>拠点追加</Button>} />
            <div>
              {sites.map((s) => (
                <div key={s.id} className="border-b border-stone-100 px-5 py-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8125rem] font-bold">{s.name}</span>
                    <span className="text-[0.6875rem] text-stone-500">装置 {data.eqs.filter((e) => e.siteId === s.id).length}台</span>
                  </div>
                  <div className="text-[0.6875rem] text-stone-500">{s.address}</div>
                  <div className="mt-2 space-y-1.5">
                    {s.contacts.map((ct) => (
                      <div key={ct.id} className="group flex items-start justify-between rounded-sm bg-stone-50 px-2.5 py-1.5">
                        <div className="text-xs">
                          <div className="font-medium">
                            {ct.name} 様<span className="ml-1.5 font-normal text-stone-500">{ct.dept} {ct.title}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.6875rem] text-stone-500">
                            {ct.phone && <span className="flex items-center gap-1"><Phone size={10} />{ct.phone}</span>}
                            {ct.email && <span className="flex items-center gap-1"><Mail size={10} />{ct.email}</span>}
                          </div>
                        </div>
                        {canEdit && (
                          <IconButton label="削除" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => { removeContact(s.id, ct.id); toast.success("担当者を削除しました"); }}>
                            <Trash2 size={12} />
                          </IconButton>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <button onClick={() => setContactSite(s)} className="flex items-center gap-1 text-[0.6875rem] text-ai-700 hover:underline">
                        <UserPlus size={12} />
                        担当者を追加
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <div className="border-b border-stone-100 px-3">
            <Tabs
              id="customer"
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "cases", label: "案件履歴", icon: <Briefcase size={14} />, count: data.cs.length },
                { key: "equipment", label: "納入装置", icon: <Cpu size={14} />, count: data.eqs.length },
                { key: "service", label: "サービス履歴", icon: <Wrench size={14} />, count: data.svcs.length },
              ]}
            />
          </div>
          {tab === "cases" && (
            <div className="overflow-x-auto">
              {data.cs.length === 0 ? (
                <EmptyState title="案件はまだありません" />
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>番号</th>
                      <th>案件名</th>
                      <th>拠点</th>
                      <th>ステージ</th>
                      <th className="text-right">金額</th>
                      <th>引合日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cs.map((x) => (
                      <tr key={x.id} className="cursor-pointer" onClick={() => router.push(`/cases/${x.id}`)}>
                        <td className="font-num whitespace-nowrap text-xs">
                          <div className="font-semibold">{x.dealNo}</div>
                          <div className="text-shu-600">{x.workNo}</div>
                        </td>
                        <td className="font-medium">{x.title}</td>
                        <td className="text-xs text-stone-600">{lk.site.get(x.siteId)?.name}</td>
                        <td>
                          <StageBadge stage={x.stage} status={x.status} />
                        </td>
                        <td className="font-num text-right">{yen(x.order?.orderAmount ?? x.expectedAmount)}</td>
                        <td className="font-num text-xs text-stone-500">{fmtDate(x.inquiryDate, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {tab === "equipment" && (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {data.eqs.length === 0 && <div className="col-span-full py-8 text-center text-xs text-stone-500">納入装置はありません</div>}
              {data.eqs.map((e) => (
                <Link key={e.id} href={`/equipment/${e.id}`} className="rounded-lg border border-stone-200 p-3 transition-all hover:border-emerald-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-num text-xs font-bold text-emerald-700">{e.serialNo}</span>
                    <Badge className={EQUIPMENT_STATUS[e.status].color} dot={EQUIPMENT_STATUS[e.status].dot}>{EQUIPMENT_STATUS[e.status].label}</Badge>
                  </div>
                  <div className="mt-0.5 text-[0.8125rem] font-medium">{e.name}</div>
                  <div className="text-[0.6875rem] text-stone-500">
                    {EQUIPMENT_TYPES[e.equipmentType].label}／{lk.site.get(e.siteId)?.name} {e.location.replace(lk.site.get(e.siteId)?.name ?? "", "")}
                  </div>
                  <div className="mt-1 text-[0.6875rem] text-stone-500">納入 {fmtDate(e.deliveredDate, false)}</div>
                </Link>
              ))}
            </div>
          )}
          {tab === "service" && <ServiceTimeline services={data.svcs} showEquipment />}
        </Card>
      </div>

      <EditCustomerModal c={c} open={editOpen} onClose={() => setEditOpen(false)} />
      <SiteModal customerId={c.id} open={siteOpen} onClose={() => setSiteOpen(false)} />
      <ContactModal site={contactSite} onClose={() => setContactSite(null)} />
    </div>
  );
}

function EditCustomerModal({ c, open, onClose }: { c: Customer; open: boolean; onClose: () => void }) {
  const update = useStore((s) => s.updateCustomer);
  const users = useStore((s) => s.users);
  const [f, setF] = useState(c);
  useEffect(() => {
    if (open) setF(c);
  }, [open, c]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="顧客情報の編集"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="primary" onClick={() => { update(c.id, f); toast.success("顧客情報を保存しました"); onClose(); }}>
            保存する
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="顧客名" required>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="フリガナ">
          <Input value={f.kana} onChange={(e) => setF({ ...f, kana: e.target.value })} />
        </Field>
        <Field label="業種">
          <Select value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </Select>
        </Field>
        <Field label="営業担当">
          <Select value={f.salesRepId} onChange={(e) => setF({ ...f, salesRepId: e.target.value })}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="所在地" className="sm:col-span-2">
          <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label="電話番号">
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="支払条件">
          <Input value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} />
        </Field>
        <Field label="与信ランク">
          <Select value={f.creditRank} onChange={(e) => setF({ ...f, creditRank: e.target.value as Customer["creditRank"] })}>
            {["A", "B", "C", "D"].map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="与信限度額">
          <NumberInput value={f.creditLimit} onChange={(v) => setF({ ...f, creditLimit: v })} suffix="円" />
        </Field>
        <Field label="メモ" className="sm:col-span-2">
          <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function SiteModal({ customerId, open, onClose }: { customerId: string; open: boolean; onClose: () => void }) {
  const addSite = useStore((s) => s.addSite);
  const [f, setF] = useState({ name: "", address: "", phone: "" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="拠点の追加"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!f.name.trim()) return toast.error("拠点名を入力してください");
              addSite(customerId, { ...f, name: f.name.trim() });
              toast.success("拠点を追加しました");
              setF({ name: "", address: "", phone: "" });
              onClose();
            }}
          >
            追加する
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="拠点名" required>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="例：第三工場" />
        </Field>
        <Field label="所在地">
          <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label="電話番号">
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function ContactModal({ site, onClose }: { site: Site | null; onClose: () => void }) {
  const addContact = useStore((s) => s.addContact);
  const [f, setF] = useState({ name: "", dept: "", title: "", email: "", phone: "" });
  return (
    <Modal
      open={!!site}
      onClose={onClose}
      title={`ご担当者の追加（${site?.name ?? ""}）`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!f.name.trim()) return toast.error("氏名を入力してください");
              addContact(site!.id, { ...f, name: f.name.trim() });
              toast.success("担当者を追加しました");
              setF({ name: "", dept: "", title: "", email: "", phone: "" });
              onClose();
            }}
          >
            追加する
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="氏名" required className="sm:col-span-2">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="例：山田 太郎" />
        </Field>
        <Field label="部署">
          <Input value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} />
        </Field>
        <Field label="役職">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="メール" className="sm:col-span-2">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="電話番号" className="sm:col-span-2">
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
