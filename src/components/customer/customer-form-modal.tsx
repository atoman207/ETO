"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { INDUSTRIES } from "@/lib/constants";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";

export function CustomerFormModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (customerId: string, siteId: string) => void }) {
  const addCustomer = useStore((s) => s.addCustomer);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const [f, setF] = useState({
    name: "",
    kana: "",
    industry: INDUSTRIES[0],
    address: "",
    phone: "",
    creditRank: "B" as "A" | "B" | "C" | "D",
    creditLimit: 30_000_000,
    paymentTerms: "月末締め 翌月末 振込",
    salesRepId: currentUserId,
    notes: "",
    siteName: "本社工場",
    siteAddress: "",
    contactName: "",
    contactDept: "",
    contactEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "顧客名を入力してください";
    if (!f.kana.trim()) e.kana = "フリガナを入力してください";
    else if (!/^[ァ-ヶー・\s　]+$/.test(f.kana.trim())) e.kana = "全角カタカナで入力してください";
    if (!f.siteName.trim()) e.siteName = "拠点名を入力してください";
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = addCustomer(
      { name: f.name.trim(), kana: f.kana.trim(), industry: f.industry, address: f.address, phone: f.phone, creditRank: f.creditRank, creditLimit: f.creditLimit, paymentTerms: f.paymentTerms, salesRepId: f.salesRepId, notes: f.notes },
      { name: f.siteName.trim(), address: f.siteAddress || f.address, phone: f.phone },
      f.contactName ? { name: f.contactName, dept: f.contactDept, title: "", email: f.contactEmail, phone: f.phone } : undefined,
    );
    const siteId = useStore.getState().sites.find((s) => s.customerId === id)?.id ?? "";
    toast.success(`顧客「${f.name}」を登録しました`);
    onCreated?.(id, siteId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新規顧客の登録"
      description="顧客と最初の拠点（納入先）を同時に登録します。拠点は後から追加できます。"
      icon={<Building2 size={16} />}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="primary" onClick={submit}>
            登録する
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="顧客名（正式名称）" required error={errors.name}>
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="例：株式会社〇〇製作所" />
        </Field>
        <Field label="フリガナ" required error={errors.kana} hint="法人格（カブシキガイシャ等）は除いて入力">
          <Input value={f.kana} onChange={(e) => set("kana", e.target.value)} placeholder="例：マルマルセイサクショ" />
        </Field>
        <Field label="業種">
          <Select value={f.industry} onChange={(e) => set("industry", e.target.value)}>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
        <Field label="営業担当">
          <Select value={f.salesRepId} onChange={(e) => set("salesRepId", e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}（{u.dept}）
              </option>
            ))}
          </Select>
        </Field>
        <Field label="本社所在地" className="sm:col-span-2">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="都道府県から入力" />
        </Field>
        <Field label="電話番号">
          <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="000-000-0000" />
        </Field>
        <Field label="支払条件">
          <Input value={f.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
        </Field>
        <Field label="与信ランク">
          <Select value={f.creditRank} onChange={(e) => set("creditRank", e.target.value)}>
            <option value="A">A（優良）</option>
            <option value="B">B（標準）</option>
            <option value="C">C（要注意）</option>
            <option value="D">D（取引制限）</option>
          </Select>
        </Field>
        <Field label="与信限度額">
          <NumberInput value={f.creditLimit} onChange={(v) => set("creditLimit", v)} suffix="円" />
        </Field>
      </div>
      <div className="mt-5 rounded-lg bg-stone-50 p-4">
        <div className="mb-3 text-xs font-bold text-stone-700">最初の拠点・ご担当者</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="拠点名" required error={errors.siteName}>
            <Input value={f.siteName} onChange={(e) => set("siteName", e.target.value)} placeholder="例：本社工場、第二工場" />
          </Field>
          <Field label="拠点所在地" hint="空欄の場合は本社所在地を使用">
            <Input value={f.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} />
          </Field>
          <Field label="ご担当者名">
            <Input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="例：山田 太郎" />
          </Field>
          <Field label="部署">
            <Input value={f.contactDept} onChange={(e) => set("contactDept", e.target.value)} placeholder="例：生産技術課" />
          </Field>
          <Field label="メールアドレス" className="sm:col-span-2">
            <Input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </Field>
        </div>
      </div>
      <Field label="備考" className="mt-4">
        <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </Modal>
  );
}
