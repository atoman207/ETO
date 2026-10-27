"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Copy, FilePlus2, Lightbulb, Plus, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { emptySpec, useStore } from "@/lib/store";
import { useCan, useCurrentUser, useLookups } from "@/lib/hooks";
import { addDays, cn, costTotal, manYen, pct, today } from "@/lib/format";
import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_KEYS, INQUIRY_CHANNELS } from "@/lib/constants";
import { similarity } from "@/lib/similarity";
import type { EquipmentType, Spec } from "@/lib/types";
import { PageHeader, LockedNotice, SectionTitle } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecEditor } from "@/components/case/spec-editor";
import { CustomerFormModal } from "@/components/customer/customer-form-modal";

export default function NewCasePage() {
  return (
    <Suspense fallback={null}>
      <NewCaseInner />
    </Suspense>
  );
}

function NewCaseInner() {
  const params = useSearchParams();
  const router = useRouter();
  const me = useCurrentUser();
  const canEdit = useCan("editCase");
  const canCost = useCan("viewCost");
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const users = useStore((s) => s.users);
  const cases = useStore((s) => s.cases);
  const createCase = useStore((s) => s.createCase);
  const lk = useLookups();

  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EquipmentType>("conveyor");
  const [inquiryDate, setInquiryDate] = useState(today());
  const [channel, setChannel] = useState(INQUIRY_CHANNELS[0]);
  const [salesRepId, setSalesRepId] = useState(me?.role === "sales" ? me.id : "u02");
  const [engineerId, setEngineerId] = useState("");
  const [desired, setDesired] = useState(addDays(today(), 210));
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState(0);
  const [prob, setProb] = useState<"A" | "B" | "C">("B");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [spec, setSpec] = useState<Spec>(emptySpec(EQUIPMENT_TYPES.conveyor.capacityUnit));
  const [refs, setRefs] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [custModal, setCustModal] = useState(false);
  const [sourceEq, setSourceEq] = useState<string | undefined>();

  // 類似案件から複製 / 顧客・装置から起票
  useEffect(() => {
    const from = params.get("from");
    const cust = params.get("customer");
    const eqId = params.get("equipment");
    if (from) {
      const src = useStore.getState().cases.find((c) => c.id === from);
      if (src) {
        setCustomerId(src.customerId);
        setSiteId(src.siteId);
        setTitle(`${src.title}（流用）`);
        setType(src.equipmentType);
        setSpec({ ...src.specs, customFields: src.specs.customFields.map((f) => ({ ...f })), options: [...src.specs.options] });
        setAmount(src.order?.orderAmount ?? src.expectedAmount);
        setEngineerId(src.engineerId ?? "");
        setRefs([src.id]);
        setTags(src.tags.join("、"));
        setDesc(`${src.workNo ?? src.dealNo}「${src.title}」をベースに仕様を検討。\n`);
      }
    }
    if (cust) {
      setCustomerId(cust);
      const first = useStore.getState().sites.find((s) => s.customerId === cust);
      if (first) setSiteId(first.id);
    }
    if (eqId) {
      const eq = useStore.getState().equipment.find((e) => e.id === eqId);
      if (eq) {
        setCustomerId(eq.customerId);
        setSiteId(eq.siteId);
        setType(eq.equipmentType);
        setSpec({ ...eq.specs });
        setTitle(`${eq.name} 更新・改造`);
        setRefs([eq.caseId]);
        setSourceEq(eq.id);
        setChannel("既存顧客（リピート）");
        setDesc(`対象装置：${eq.serialNo} ${eq.name}（${eq.location}）\n`);
      }
    }
  }, [params]);

  const customerSites = sites.filter((s) => s.customerId === customerId);
  const customer = lk.customer.get(customerId);

  const similar = useMemo(() => {
    return cases
      .filter((c) => c.order && c.status !== "lost")
      .map((c) => ({ c, ...similarity({ equipmentType: type, specs: spec, industry: customer?.industry }, c, lk.customer.get(c.customerId)) }))
      .filter((x) => x.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [cases, type, spec, customer, lk]);

  const estimate = useMemo(() => {
    const top = similar.filter((s) => s.c.equipmentType === type).slice(0, 3);
    if (!top.length || !spec.capacity) return undefined;
    const vals = top.map(({ c }) => {
      const ratio = c.specs.capacity ? Math.pow(spec.capacity / c.specs.capacity, 0.6) : 1;
      return (c.order?.orderAmount ?? c.expectedAmount) * ratio;
    });
    const margins = top.map(({ c }) => {
      const cost = costTotal(c.actualCost ?? c.costEstimate);
      const price = c.order?.orderAmount ?? c.expectedAmount;
      return price ? 1 - cost / price : 0;
    });
    return { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length, margin: margins.reduce((a, b) => a + b, 0) / margins.length, n: top.length };
  }, [similar, type, spec.capacity]);

  const changeType = (t: EquipmentType) => {
    setType(t);
    setSpec((s) => ({ ...s, capacityUnit: EQUIPMENT_TYPES[t].capacityUnit }));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!customerId) e.customer = "顧客を選択してください";
    if (!siteId) e.site = "納入先拠点を選択してください";
    if (!title.trim()) e.title = "案件名を入力してください";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("入力内容を確認してください");
      return;
    }
    const id = createCase({
      title: title.trim(),
      customerId,
      siteId,
      equipmentType: type,
      salesRepId,
      engineerId: engineerId || undefined,
      inquiryDate,
      inquiryChannel: channel,
      desiredDeliveryDate: desired || undefined,
      budget,
      expectedAmount: amount,
      probability: prob,
      description: desc,
      specs: spec,
      tags: tags.split(/[、,，\s]+/).filter(Boolean),
      referenceCaseIds: refs,
      sourceEquipmentId: sourceEq,
    });
    const c = useStore.getState().cases.find((x) => x.id === id);
    toast.success(`引合を登録しました（取引番号 ${c?.dealNo}）`, { description: "Google Drive に案件フォルダを作成しました" });
    router.push(`/cases/${id}`);
  };

  if (!canEdit) {
    return (
      <div>
        <PageHeader title="新規引合の登録" breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "案件一覧", href: "/cases" }, { label: "新規引合" }]} />
        <LockedNotice message="引合の登録は営業部門・管理者のみ可能です。右上のユーザー切替から営業担当者に切り替えてください。" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="新規引合の登録"
        description="登録すると取引番号が自動採番され、Google Drive に案件フォルダが作成されます"
        icon={<FilePlus2 size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "案件一覧", href: "/cases" }, { label: "新規引合" }]}
        actions={
          <>
            <Button onClick={() => router.back()}>キャンセル</Button>
            <Button variant="accent" icon={<Check size={15} />} onClick={submit}>
              引合を登録する
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="顧客・納入先" description="顧客を選ぶと、拠点・支払条件・与信情報が自動で引き継がれます" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="顧客" required error={errors.customer}>
                  <div className="flex gap-2">
                    <Select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        setSiteId(sites.find((s) => s.customerId === e.target.value)?.id ?? "");
                      }}
                    >
                      <option value="">選択してください</option>
                      {[...customers].sort((a, b) => a.kana.localeCompare(b.kana, "ja")).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <Button icon={<Plus size={14} />} onClick={() => setCustModal(true)} title="新規顧客を登録">
                      新規
                    </Button>
                  </div>
                </Field>
                <Field label="納入先拠点" required error={errors.site}>
                  <Select value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={!customerId}>
                    <option value="">{customerId ? "選択してください" : "先に顧客を選択"}</option>
                    {customerSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <AnimatePresence>
                {customer && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 grid gap-3 rounded-md bg-kinari px-4 py-3 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-stone-500">業種</div>
                        <div className="font-medium text-stone-800">{customer.industry}</div>
                      </div>
                      <div>
                        <div className="text-stone-500">与信ランク</div>
                        <div className={cn("font-medium", customer.creditRank === "C" || customer.creditRank === "D" ? "text-rose-700" : "text-stone-800")}>
                          {customer.creditRank}　限度額 {manYen(customer.creditLimit)}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-stone-500">支払条件</div>
                        <div className="font-medium text-stone-800">{customer.paymentTerms}</div>
                      </div>
                      {customer.notes && <div className="text-stone-600 sm:col-span-4">📝 {customer.notes}</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="引合内容" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-6">
                <Field label="案件名" required error={errors.title} className="sm:col-span-4">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：部品洗浄装置 増設（2号機）" />
                </Field>
                <Field label="装置種別" required className="sm:col-span-2">
                  <Select value={type} onChange={(e) => changeType(e.target.value as EquipmentType)}>
                    {EQUIPMENT_TYPE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {EQUIPMENT_TYPES[k].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="引合日" className="sm:col-span-2">
                  <Input type="date" value={inquiryDate} onChange={(e) => setInquiryDate(e.target.value)} />
                </Field>
                <Field label="引合経路" className="sm:col-span-2">
                  <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                    {INQUIRY_CHANNELS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="希望納期" className="sm:col-span-2">
                  <Input type="date" value={desired} onChange={(e) => setDesired(e.target.value)} />
                </Field>
                <Field label="営業担当" className="sm:col-span-2">
                  <Select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)}>
                    {users
                      .filter((u) => u.role === "sales")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="設計担当" className="sm:col-span-2">
                  <Select value={engineerId} onChange={(e) => setEngineerId(e.target.value)}>
                    <option value="">未定</option>
                    {users
                      .filter((u) => u.role === "engineer")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="確度" className="sm:col-span-2" hint="A：内示あり／B：検討中／C：情報収集">
                  <Select value={prob} onChange={(e) => setProb(e.target.value as "A" | "B" | "C")}>
                    <option value="A">A（高）</option>
                    <option value="B">B（中）</option>
                    <option value="C">C（低）</option>
                  </Select>
                </Field>
                <Field label="客先予算" className="sm:col-span-3">
                  <NumberInput value={budget} onChange={(v) => setBudget(v || undefined)} suffix="円" placeholder="不明な場合は空欄" />
                </Field>
                <Field label="見込金額" className="sm:col-span-3" hint={estimate ? `類似案件からの目安：${manYen(estimate.min)}〜${manYen(estimate.max)}` : undefined}>
                  <div className="flex gap-2">
                    <NumberInput value={amount} onChange={setAmount} suffix="円" className="flex-1" />
                    {estimate && (
                      <Button size="md" icon={<Sparkles size={14} />} onClick={() => setAmount(Math.round(estimate.avg / 100000) * 100000)}>
                        目安を適用
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="引合内容・お客様のご要望" className="sm:col-span-6">
                  <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="背景・目的、現状の課題、ご要望、設置条件など" />
                </Field>
                <Field label="タグ" className="sm:col-span-6" hint="「、」区切りで入力（検索・分析に利用されます）">
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例：自動車、洗浄、リピート" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="仕様（概略）" description="入力に合わせて右側に類似の過去案件が表示されます" />
            <CardBody>
              <SpecEditor value={spec} onChange={setSpec} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-stone-100 bg-gradient-to-r from-ai-800 to-ai-700 px-4 py-3 text-white">
              <Lightbulb size={16} className="text-shu-300" />
              <div>
                <div className="text-[0.8125rem] font-bold">類似の過去案件</div>
                <div className="text-[0.625rem] text-ai-200">装置種別・能力・寸法・材質・環境・業種から自動判定</div>
              </div>
            </div>
            <div>
              {similar.length === 0 && <div className="px-4 py-8 text-center text-xs leading-relaxed text-stone-500">処理能力や材質を入力すると、<br />類似の納入実績が表示されます</div>}
              <AnimatePresence initial={false}>
                {similar.map(({ c, score, reasons }) => {
                  const added = refs.includes(c.id);
                  const price = c.order?.orderAmount ?? c.expectedAmount;
                  const cost = costTotal(c.actualCost ?? c.costEstimate);
                  return (
                    <motion.div key={c.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="border-b border-stone-100 px-4 py-3 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-num text-[0.6875rem] font-semibold text-shu-600">{c.workNo}</div>
                          <Link href={`/cases/${c.id}`} target="_blank" className="block text-[0.8125rem] font-medium leading-snug text-stone-800 hover:text-ai-700 hover:underline">
                            {c.title}
                          </Link>
                          <div className="truncate text-[0.6875rem] text-stone-500">{lk.customer.get(c.customerId)?.name}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-num text-lg font-bold leading-none text-ai-700">{score}</div>
                          <div className="text-[0.5625rem] text-stone-400">類似度</div>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {reasons.slice(0, 3).map((r) => (
                          <span key={r} className="rounded-sm bg-ai-50 px-1.5 text-[0.625rem] text-ai-700">
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1 text-[0.6875rem]">
                        <span className="text-stone-500">
                          能力 <span className="font-num text-stone-700">{c.specs.capacity.toLocaleString()}{c.specs.capacityUnit}</span>
                        </span>
                        <span className="text-stone-500">
                          受注 <span className="font-num text-stone-700">{manYen(price)}</span>
                        </span>
                        {canCost && (
                          <span className="col-span-2 text-stone-500">
                            {c.actualCost ? "実績" : "見積"}粗利率 <span className="font-num text-stone-700">{pct(price ? 1 - cost / price : 0)}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Button
                          size="xs"
                          variant={added ? "primary" : "secondary"}
                          icon={added ? <Check size={12} /> : <Plus size={12} />}
                          onClick={() => setRefs((r) => (added ? r.filter((x) => x !== c.id) : [...r, c.id]))}
                        >
                          {added ? "参考案件に追加済" : "参考案件に追加"}
                        </Button>
                        <Button
                          size="xs"
                          icon={<Copy size={12} />}
                          onClick={() => {
                            setSpec({ ...c.specs, options: [...c.specs.options], customFields: c.specs.customFields.map((f) => ({ ...f })) });
                            setType(c.equipmentType);
                            if (!refs.includes(c.id)) setRefs((r) => [...r, c.id]);
                            toast.success(`${c.workNo} の仕様を取り込みました`);
                          }}
                        >
                          仕様を取込
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>

          {estimate && (
            <Card>
              <CardBody>
                <SectionTitle>過去実績からの金額目安</SectionTitle>
                <div className="font-num text-xl font-bold text-stone-900">
                  {manYen(estimate.min)} 〜 {manYen(estimate.max)}
                </div>
                <p className="mt-1 text-[0.6875rem] leading-relaxed text-stone-500">
                  類似 {estimate.n} 件の受注金額を、処理能力比（0.6乗則）で補正した参考値です。
                  {canCost && <>平均粗利率は {pct(estimate.margin)} です。</>}
                </p>
              </CardBody>
            </Card>
          )}

          {refs.length > 0 && (
            <Card>
              <CardBody>
                <SectionTitle>参考案件（{refs.length}件）</SectionTitle>
                <div className="space-y-1">
                  {refs.map((id) => {
                    const c = lk.case.get(id);
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-sm bg-stone-50 px-2 py-1.5 text-xs">
                        <Badge className="bg-surface text-shu-700 ring-shu-200">{c.workNo ?? c.dealNo}</Badge>
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        <button onClick={() => setRefs((r) => r.filter((x) => x !== id))} className="text-stone-400 hover:text-stone-700" aria-label="削除">
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.6875rem] text-stone-500">参考案件は、原価確認・BOM流用の候補として案件詳細に表示されます。</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <CustomerFormModal
        open={custModal}
        onClose={() => setCustModal(false)}
        onCreated={(cid, sid) => {
          setCustomerId(cid);
          setSiteId(sid);
        }}
      />
    </div>
  );
}
