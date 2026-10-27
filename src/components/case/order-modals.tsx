"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Hash, Handshake, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { addDays, quoteSubtotal, today, yen } from "@/lib/format";
import type { Case } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NumberInput, Select } from "@/components/ui/form";
import { NumberTag } from "@/components/ui/badge";

export function OrderModal({ c, open, onClose, onIssued }: { c: Case; open: boolean; onClose: () => void; onIssued: (workNo: string) => void }) {
  const quotes = useStore((s) => s.quotes);
  const registerOrder = useStore((s) => s.registerOrder);
  const lk = useLookups();
  const caseQuotes = useMemo(() => quotes.filter((q) => q.caseId === c.id && q.status !== "draft" && q.status !== "declined").sort((a, b) => b.revision - a.revision), [quotes, c.id]);
  const cust = lk.customer.get(c.customerId);
  const site = lk.site.get(c.siteId);
  const [quoteId, setQuoteId] = useState("");
  const [f, setF] = useState({ orderDate: today(), orderAmount: 0, customerPoNo: "", deliveryDate: "", deliveryPlace: "", paymentTerms: "", quantity: 1 });
  const [issue, setIssue] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const q = caseQuotes[0];
    setQuoteId(q?.id ?? "");
    setF({
      orderDate: today(),
      orderAmount: q ? quoteSubtotal(q) : c.expectedAmount,
      customerPoNo: "",
      deliveryDate: c.desiredDeliveryDate ?? addDays(today(), 180),
      deliveryPlace: `${cust?.name ?? ""} ${site?.name ?? ""}`,
      paymentTerms: q?.paymentTerms ?? cust?.paymentTerms ?? "",
      quantity: q?.items[0]?.qty ?? 1,
    });
    setErr("");
  }, [open, caseQuotes, c, cust, site]);

  const reviewOk = c.review.status === "approved";

  const submit = () => {
    if (!f.customerPoNo.trim()) return setErr("客先注文番号を入力してください（注文書・注文請書の番号）");
    if (!f.deliveryDate) return setErr("納期を入力してください");
    const workNo = registerOrder(c.id, { ...f, customerPoNo: f.customerPoNo.trim() }, issue, quoteId || undefined);
    onClose();
    if (workNo) onIssued(workNo);
    else toast.success("受注を登録しました", { description: "工事番号は案件画面から発行できます" });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="受注登録"
      description="客先注文書の内容を登録します。見積・案件情報から自動転記されています。"
      icon={<Handshake size={16} />}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="accent" onClick={submit} disabled={!reviewOk}>
            {issue ? "受注登録して工番を発行" : "受注登録する"}
          </Button>
        </>
      }
    >
      {!reviewOk && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          取引審査の承認が完了していません。社内規程により、承認完了後に受注登録が可能になります。
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="受注対象の見積">
          <Select
            value={quoteId}
            onChange={(e) => {
              setQuoteId(e.target.value);
              const q = caseQuotes.find((x) => x.id === e.target.value);
              if (q) setF((p) => ({ ...p, orderAmount: quoteSubtotal(q), paymentTerms: q.paymentTerms }));
            }}
          >
            <option value="">見積なし</option>
            {caseQuotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quoteNo}（Rev.{q.revision}）{yen(quoteSubtotal(q))}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="客先注文番号" required>
          <Input value={f.customerPoNo} onChange={(e) => setF({ ...f, customerPoNo: e.target.value })} placeholder="例：PO-2026-01234" />
        </Field>
        <Field label="受注日" required>
          <Input type="date" value={f.orderDate} onChange={(e) => setF({ ...f, orderDate: e.target.value })} />
        </Field>
        <Field label="受注金額（税抜）" required>
          <NumberInput value={f.orderAmount} onChange={(v) => setF({ ...f, orderAmount: v })} suffix="円" />
        </Field>
        <Field label="納期" required>
          <Input type="date" value={f.deliveryDate} onChange={(e) => setF({ ...f, deliveryDate: e.target.value })} />
        </Field>
        <Field label="台数">
          <NumberInput value={f.quantity} onChange={(v) => setF({ ...f, quantity: Math.max(1, Math.round(v)) })} suffix="台" min={1} />
        </Field>
        <Field label="納入場所" className="sm:col-span-2">
          <Input value={f.deliveryPlace} onChange={(e) => setF({ ...f, deliveryPlace: e.target.value })} />
        </Field>
        <Field label="支払条件" className="sm:col-span-2">
          <Input value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 rounded-md bg-ai-50 px-4 py-3">
        <Checkbox checked={issue} onChange={setIssue} label={<span className="font-medium text-ai-900">同時に工事番号（工番）を発行する</span>} />
        <p className="ml-6 mt-1 text-[0.6875rem] text-ai-800/80">工番発行と同時に、社内注文書の作成・標準製造工程の計画・案件メンバーへの通知を自動で行います。</p>
      </div>
      {err && <p className="mt-3 text-xs text-rose-600">{err}</p>}
    </Modal>
  );
}

export function WorkNoIssuedModal({ c, workNo, onClose }: { c: Case; workNo: string | null; onClose: () => void }) {
  const quotes = useStore((s) => s.quotes);
  const accepted = quotes.find((q) => q.caseId === c.id && q.status === "accepted");
  return (
    <AnimatePresence>
      {workNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-ai-950/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface text-center shadow-2xl"
          >
            <div className="bg-gradient-to-b from-ai-800 to-ai-900 px-8 pb-8 pt-7 text-white">
              <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-shu-500">
                <PartyPopper size={22} />
              </motion.div>
              <div className="mt-3 text-sm text-ai-200">受注おめでとうございます</div>
              <div className="mt-1 text-lg font-bold">工事番号を発行しました</div>
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: -3 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 14 }}
                className="font-num mx-auto mt-4 inline-flex items-center gap-2 rounded-lg border-[3px] border-shu-400 px-5 py-2 text-4xl font-bold tracking-wider text-shu-300"
              >
                <Hash size={28} />
                {workNo}
              </motion.div>
            </div>
            <div className="px-8 py-6">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <NumberTag label="取引" value={c.dealNo} />
                <ArrowRight size={14} className="text-stone-400" />
                <NumberTag label="見積" value={accepted?.quoteNo} tone="ai" />
                <ArrowRight size={14} className="text-stone-400" />
                <NumberTag label="工番" value={workNo} tone="shu" />
              </div>
              <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-[0.8125rem] text-stone-600">
                {["社内注文書を作成し、Drive に保存しました", "標準製造工程（9工程）を納期から逆算して計画しました", "設計・購買・製造の各部門に通知しました"].map((t, i) => (
                  <motion.li key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.12 }} className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[0.625rem] text-white">✓</span>
                    {t}
                  </motion.li>
                ))}
              </ul>
              <Button variant="primary" size="lg" className="mt-6" onClick={onClose}>
                BOM作成へ進む
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
