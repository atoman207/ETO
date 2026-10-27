"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Boxes, ChevronDown, Layers, Package, Plus, Search, Trash2, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { can, useCan, useLookups } from "@/lib/hooks";
import { cn, fmtDate, matches, yen } from "@/lib/format";
import { EQUIPMENT_TYPES, PERMISSION_LABELS, PROCUREMENT, ROLES, ROLE_PERMISSIONS } from "@/lib/constants";
import type { Part, Procurement, Supplier } from "@/lib/types";
import { PageHeader, Avatar, LockedNotice } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Field, Input, NumberInput, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";

type Tab = "parts" | "suppliers" | "templates" | "users";

export default function MastersPage() {
  const [tab, setTab] = useState<Tab>("parts");
  const parts = useStore((s) => s.parts);
  const suppliers = useStore((s) => s.suppliers);
  const templates = useStore((s) => s.bomTemplates);
  const users = useStore((s) => s.users);
  return (
    <div>
      <PageHeader title="マスタ管理" description="品目・仕入先・標準モジュール（BOMテンプレート）・社員を管理します" icon={<Boxes size={20} />} breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "マスタ管理" }]} />
      <Card className="mb-4 px-3">
        <Tabs
          id="masters"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "parts", label: "品目マスタ", icon: <Package size={14} />, count: parts.length },
            { key: "suppliers", label: "仕入先マスタ", icon: <Truck size={14} />, count: suppliers.length },
            { key: "templates", label: "BOMテンプレート（標準モジュール）", icon: <Layers size={14} />, count: templates.length },
            { key: "users", label: "社員・権限", icon: <Users size={14} />, count: users.length },
          ]}
        />
      </Card>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === "parts" && <PartsTab />}
          {tab === "suppliers" && <SuppliersTab />}
          {tab === "templates" && <TemplatesTab />}
          {tab === "users" && <UsersTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PartsTab() {
  const parts = useStore((s) => s.parts);
  const cases = useStore((s) => s.cases);
  const updatePart = useStore((s) => s.updatePart);
  const deletePart = useStore((s) => s.deletePart);
  const canEdit = useCan("editMaster");
  const showCost = useCan("viewCost");
  const lk = useLookups();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Part | null>(null);
  const cats = Array.from(new Set(parts.map((p) => p.category)));
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    cases.forEach((c) => new Set(c.bom.map((b) => b.partNo)).forEach((pn) => m.set(pn, (m.get(pn) ?? 0) + 1)));
    return m;
  }, [cases]);
  const list = parts.filter((p) => (cat === "all" || p.category === cat) && matches(q, p.partNo, p.name, p.spec, p.maker));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="品番・品名・型式・メーカー" className="pl-9" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-40">
          <option value="all">全分類</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <span className="text-xs text-stone-500">{list.length}件</span>
        {canEdit && <Button variant="primary" size="sm" icon={<Plus size={14} />} className="ml-auto" onClick={() => setOpen(true)}>品目を登録</Button>}
      </div>
      {!canEdit && <div className="px-4 pt-3"><LockedNotice message="マスタの編集はシステム管理者のみ可能です（閲覧のみ）" /></div>}
      <div className="scroll-thin max-h-[620px] overflow-auto">
        <table className="tbl tbl-compact">
          <thead>
            <tr>
              <th>品番</th>
              <th>品名</th>
              <th>型式・仕様</th>
              <th>分類</th>
              <th>メーカー</th>
              <th>単位</th>
              {showCost && <th className="w-32 text-right">標準単価</th>}
              <th>標準仕入先</th>
              <th className="w-20 text-right">LT</th>
              <th>手配</th>
              <th className="text-right">使用案件数</th>
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="group">
                <td className="font-num text-xs font-semibold">{p.partNo}</td>
                <td className="text-[13px]">{p.name}</td>
                <td className="text-xs text-stone-500">{p.spec}</td>
                <td><Badge>{p.category}</Badge></td>
                <td className="text-xs">{p.maker}</td>
                <td className="text-xs">{p.unit}</td>
                {showCost && <td><NumberInput compact value={p.standardCost} disabled={!canEdit} onChange={(v) => updatePart(p.id, { standardCost: v })} /></td>}
                <td className="text-[11px] text-stone-600">{p.supplierId ? lk.supplier.get(p.supplierId)?.name : "社内"}</td>
                <td><NumberInput compact value={p.leadTimeDays} disabled={!canEdit} onChange={(v) => updatePart(p.id, { leadTimeDays: v })} suffix="日" /></td>
                <td><Badge className={PROCUREMENT[p.procurement].color}>{PROCUREMENT[p.procurement].label}</Badge></td>
                <td className="font-num text-right text-xs">{usage.get(p.partNo) ?? 0}</td>
                {canEdit && (
                  <td>
                    <IconButton label="削除" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setDel(p)}>
                      <Trash2 size={13} />
                    </IconButton>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PartModal open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { deletePart(del.id); toast.success("品目を削除しました"); } }} title="品目の削除" message={`${del?.partNo} ${del?.name} を削除します。既存のBOMには影響しません。`} confirmLabel="削除する" danger />
    </Card>
  );
}

function PartModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useStore((s) => s.addPart);
  const parts = useStore((s) => s.parts);
  const suppliers = useStore((s) => s.suppliers);
  const [f, setF] = useState<Omit<Part, "id">>({ partNo: "", name: "", spec: "", category: "機械要素", maker: "", unit: "個", standardCost: 0, supplierId: "", leadTimeDays: 14, procurement: "buy" });
  const cats = Array.from(new Set(parts.map((p) => p.category)));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="品目の登録"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!f.partNo.trim() || !f.name.trim()) return toast.error("品番と品名は必須です");
              if (parts.some((p) => p.partNo.toLowerCase() === f.partNo.trim().toLowerCase())) return toast.error("同じ品番が既に登録されています");
              add({ ...f, partNo: f.partNo.trim(), name: f.name.trim(), supplierId: f.supplierId || undefined });
              toast.success(`品目 ${f.partNo} を登録しました`);
              setF({ ...f, partNo: "", name: "", spec: "", maker: "", standardCost: 0 });
              onClose();
            }}
          >
            登録する
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="品番" required><Input value={f.partNo} onChange={(e) => setF({ ...f, partNo: e.target.value })} placeholder="例：M-3011" /></Field>
        <Field label="品名" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="型式・仕様" className="sm:col-span-2"><Input value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} /></Field>
        <Field label="分類">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="メーカー"><Input value={f.maker} onChange={(e) => setF({ ...f, maker: e.target.value })} /></Field>
        <Field label="単位"><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
        <Field label="標準単価"><NumberInput value={f.standardCost} onChange={(v) => setF({ ...f, standardCost: v })} suffix="円" /></Field>
        <Field label="手配区分">
          <Select value={f.procurement} onChange={(e) => setF({ ...f, procurement: e.target.value as Procurement })}>
            {(Object.keys(PROCUREMENT) as Procurement[]).map((k) => <option key={k} value={k}>{PROCUREMENT[k].label}</option>)}
          </Select>
        </Field>
        <Field label="標準仕入先">
          <Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
            <option value="">社内／未定</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="標準リードタイム"><NumberInput value={f.leadTimeDays} onChange={(v) => setF({ ...f, leadTimeDays: v })} suffix="日" /></Field>
      </div>
    </Modal>
  );
}

function SuppliersTab() {
  const suppliers = useStore((s) => s.suppliers);
  const pos = useStore((s) => s.purchaseOrders);
  const addSupplier = useStore((s) => s.addSupplier);
  const canEdit = useCan("editMaster");
  const showCost = useCan("viewCost");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Supplier, "id" | "code">>({ name: "", category: "", phone: "", address: "", contact: "", rating: 3 });
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <span className="text-xs text-stone-500">{suppliers.length}社</span>
        {canEdit && <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>仕入先を登録</Button>}
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>コード</th>
              <th>仕入先名</th>
              <th>取扱分類</th>
              <th>連絡先</th>
              <th>評価</th>
              <th className="text-right">発注件数</th>
              {showCost && <th className="text-right">発注金額（累計）</th>}
              <th className="text-right">納期遅れ</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const list = pos.filter((p) => p.supplierId === s.id && p.status !== "cancelled" && p.status !== "requested");
              const late = list.filter((p) => p.receivedDate && p.receivedDate > p.dueDate).length;
              return (
                <tr key={s.id}>
                  <td className="font-num text-xs">{s.code}</td>
                  <td className="font-medium">{s.name}</td>
                  <td className="text-xs">{s.category}</td>
                  <td className="text-xs text-stone-600">{s.contact}<div className="font-num text-[11px] text-stone-400">{s.phone}</div></td>
                  <td className="text-amber-500">{"★".repeat(s.rating)}<span className="text-stone-200">{"★".repeat(5 - s.rating)}</span></td>
                  <td className="font-num text-right text-xs">{list.length}</td>
                  {showCost && <td className="font-num text-right text-xs">{yen(list.reduce((t, p) => t + p.lines.reduce((x, l) => x + l.qty * l.unitPrice, 0), 0))}</td>}
                  <td className="font-num text-right text-xs">{late}件</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="仕入先の登録"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={() => { if (!f.name.trim()) return toast.error("仕入先名を入力してください"); addSupplier({ ...f, name: f.name.trim() }); toast.success("仕入先を登録しました"); setOpen(false); setF({ name: "", category: "", phone: "", address: "", contact: "", rating: 3 }); }}>登録する</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="仕入先名" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="取扱分類"><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="例：機械加工（外注）" /></Field>
          <Field label="評価">
            <Select value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) as Supplier["rating"] })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
            </Select>
          </Field>
          <Field label="担当者"><Input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
          <Field label="電話番号"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="所在地" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

function TemplatesTab() {
  const templates = useStore((s) => s.bomTemplates);
  const del = useStore((s) => s.deleteTemplate);
  const canEdit = useCan("editMaster");
  const showCost = useCan("viewCost");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-stone-500">案件のBOM画面で、ユニット行の「標準モジュールとして登録」から追加できます。登録したモジュールは、BOM作成時にワンクリックで展開できます。</p>
      {templates.map((t) => {
        const total = t.items.filter((i) => i.parentKey).reduce((s, i) => s + i.qty * i.unitCost, 0);
        const isOpen = open === t.id;
        return (
          <Card key={t.id} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setOpen(isOpen ? null : t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <ChevronDown size={16} className={cn("text-stone-400 transition-transform", !isOpen && "-rotate-90")} />
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ai-50 text-ai-700"><Layers size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{t.name}</span>
                  <span className="block truncate text-[11px] text-stone-500">{t.description}</span>
                </span>
              </button>
              <Badge>{t.equipmentType ? EQUIPMENT_TYPES[t.equipmentType].label : "共通"}</Badge>
              <span className="text-xs text-stone-500">{t.items.length - 1}品目</span>
              {showCost && <span className="font-num w-28 text-right text-xs">{yen(total)}</span>}
              <span className="font-num hidden text-[11px] text-stone-400 md:inline">{fmtDate(t.createdAt.slice(0, 10), false)}</span>
              {canEdit && (
                <IconButton label="削除" onClick={() => { del(t.id); toast.success("テンプレートを削除しました"); }}>
                  <Trash2 size={14} />
                </IconButton>
              )}
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <table className="tbl tbl-compact border-t border-stone-100">
                    <thead>
                      <tr>
                        <th>品番</th>
                        <th>品名</th>
                        <th>型式・仕様</th>
                        <th>メーカー</th>
                        <th className="text-right">数量</th>
                        {showCost && <th className="text-right">単価</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {t.items.filter((i) => i.parentKey).map((i) => (
                        <tr key={i.key}>
                          <td className="font-num text-xs">{i.partNo}</td>
                          <td className="text-[13px]">{i.name}</td>
                          <td className="text-xs text-stone-500">{i.spec}</td>
                          <td className="text-xs">{i.maker}</td>
                          <td className="font-num text-right text-xs">{i.qty} {i.unit}</td>
                          {showCost && <td className="font-num text-right text-xs">{yen(i.unitCost)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}

function UsersTab() {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>氏名</th>
              <th>部署・役職</th>
              <th>ロール</th>
              <th>承認段階</th>
              <th>権限</th>
              <th>メール</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={cn(u.id === currentUserId && "bg-ai-50/60")}>
                <td>
                  <span className="flex items-center gap-2">
                    <Avatar user={u} size={26} className="ring-0" />
                    <span>
                      <span className="block text-[13px] font-medium">{u.name}{u.id === currentUserId && <span className="ml-1.5 text-[10px] text-ai-700">（ログイン中）</span>}</span>
                      <span className="block text-[10px] text-stone-400">{u.kana}</span>
                    </span>
                  </span>
                </td>
                <td className="text-xs">{u.dept}{u.title && `・${u.title}`}</td>
                <td><span className={cn("rounded px-1.5 py-0.5 text-[11px]", ROLES[u.role].color)}>{ROLES[u.role].label}</span></td>
                <td className="text-xs">{can(u, "approve") ? ["担当", "課長", "部長・役員"][u.approvalLevel] : "—"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {ROLE_PERMISSIONS[u.role].map((p) => <Badge key={p}>{PERMISSION_LABELS[p].label}</Badge>)}
                  </div>
                </td>
                <td className="text-xs text-stone-500">{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-2 text-[11px] text-stone-500">本番環境では Google Workspace のアカウント（SSO）と連携し、組織部門・グループから自動的にロールを割り当てます。</div>
    </Card>
  );
}
