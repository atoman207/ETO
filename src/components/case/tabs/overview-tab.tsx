"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Hash, Link2, Pencil, Pin, PinOff, Send, Sparkles, Trash2, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { can, useCan, useCurrentUser, useLookups } from "@/lib/hooks";
import { cn, costTotal, fmtDate, fmtDateTime, manYen, pct, relTime, yen } from "@/lib/format";
import { EQUIPMENT_TYPES, INQUIRY_CHANNELS, QUOTE_STATUS, SERVICE_TYPES, stageDef } from "@/lib/constants";
import type { Case } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, DL, ProgressBar, UserChip } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";

function useNextAction({ c, goTab, openOrder, onWorkNo }: CaseTabProps) {
  const quotes = useStore((s) => s.quotes);
  const issueWorkNo = useStore((s) => s.issueWorkNo);
  const me = useCurrentUser();
  const caseQuotes = quotes.filter((q) => q.caseId === c.id).sort((a, b) => b.revision - a.revision);
  const latest = caseQuotes[0];
  if (c.status === "lost") return { title: "失注案件です", body: "失注理由は類似案件検索で参照され、次回の見積に活かされます。", label: "類似案件を確認", onClick: () => (window.location.href = `/search?case=${c.id}`) };
  if (c.status === "onhold") return { title: "保留中の案件です", body: "再開する場合は「操作」メニューから進行中に戻してください。", label: "引継ぎメモを確認", onClick: () => undefined };
  switch (c.stage) {
    case "inquiry":
      return { title: "類似案件を参考に原価を確認しましょう", body: "過去の納入実績から原価構成を取り込めます。ゼロから積算する必要はありません。", label: "原価確認へ", onClick: () => goTab("cost") };
    case "costing":
      return { title: "概算原価を確定してください", body: "確定すると見積作成に進みます。原価は見積明細に自動で引き継がれます。", label: "原価を確認する", onClick: () => goTab("cost") };
    case "quotation":
      if (!latest) return { title: "見積書を作成しましょう", body: "顧客名・件名・支払条件・原価は案件情報から自動転記されます。", label: "見積を作成", onClick: () => goTab("quote") };
      if (latest.status === "draft") return { title: `${latest.quoteNo} の承認申請`, body: "内容を確認し、上長へ承認を申請してください。", label: "見積を確認", onClick: () => goTab("quote") };
      if (latest.status === "pending") return { title: `${latest.quoteNo} は承認待ちです`, body: "承認権限のあるユーザーで承認してください（右上で切替可能）。", label: "承認状況を見る", onClick: () => goTab("quote") };
      if (latest.status === "approved") return { title: "承認済みの見積を客先へ提出", body: "提出すると見積書PDFが Drive に保存されます。", label: "見積を提出", onClick: () => goTab("quote") };
      return { title: "受注に向けて取引審査を申請", body: "与信・採算・納期・技術リスクを確認し、受注可否を判断します。", label: "取引審査へ", onClick: () => goTab("review") };
    case "review":
      if (c.review.status === "approved") return { title: "取引審査が承認されました", body: "客先注文書を受領したら受注登録を行い、工事番号を発行してください。", label: "受注登録", onClick: openOrder, accent: true };
      return { title: "取引審査の承認待ちです", body: "承認者（課長・部長/役員）による承認が必要です。", label: "審査内容を見る", onClick: () => goTab("review") };
    case "ordered":
      return {
        title: "工事番号を発行してください",
        body: "工番を発行すると、社内注文書・製造工程計画が自動作成され、設計・購買・製造が着手できます。",
        label: "工番を発行する",
        accent: true,
        disabled: !can(me, "editCase"),
        onClick: () => {
          const w = issueWorkNo(c.id);
          onWorkNo(w);
        },
      };
    case "design":
      return c.bom.length
        ? { title: "BOMから購買依頼を作成", body: "購入品を仕入先ごとにまとめて、購買依頼を一括作成できます。", label: "BOMを確認", onClick: () => goTab("bom") }
        : { title: "BOM（部品表）を作成しましょう", body: "類似案件の流用・標準モジュール・Excel貼付けで入力負担を大幅に削減できます。", label: "BOM作成へ", onClick: () => goTab("bom"), accent: true };
    case "procurement":
      return { title: "発注・入荷状況を管理", body: "購買依頼の発注処理と入荷登録を行ってください。", label: "購買へ", onClick: () => goTab("purchase") };
    case "manufacturing":
      return { title: "製造工程の進捗を更新", body: "工程ごとの進捗率を更新すると、全社の製造進捗画面に反映されます。", label: "製造工程へ", onClick: () => goTab("production") };
    case "delivery":
      return { title: "出荷・納品を登録", body: "納品完了を登録すると、装置台帳に製造番号付きで自動登録されます。", label: "出荷・納品へ", onClick: () => goTab("shipment"), accent: true };
    case "aftercare":
      return { title: "納入済み装置のアフターサービス", body: "修理・改造・部品交換の履歴は装置単位で蓄積されます。", label: "装置・アフターへ", onClick: () => goTab("after") };
    default:
      return { title: "", body: "", label: "", onClick: () => undefined };
  }
}

export function OverviewTab(props: CaseTabProps) {
  const { c, goTab } = props;
  const lk = useLookups();
  const quotes = useStore((s) => s.quotes);
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const canCost = useCan("viewCost");
  const canEdit = useCan("editCase");
  const next = useNextAction(props);
  const [edit, setEdit] = useState(false);
  const cust = lk.customer.get(c.customerId);
  const site = lk.site.get(c.siteId);
  const caseQuotes = useMemo(() => quotes.filter((q) => q.caseId === c.id).sort((a, b) => a.revision - b.revision), [quotes, c.id]);
  const eqs = equipment.filter((e) => e.caseId === c.id);
  const svcs = services.filter((s) => eqs.some((e) => e.id === s.equipmentId));
  const price = c.order?.orderAmount ?? c.expectedAmount;
  const cost = costTotal(c.actualCost ?? c.costEstimate);
  const progress = c.processes.length ? Math.round(c.processes.reduce((s, p) => s + p.progress, 0) / c.processes.length) : 0;
  const srcEq = c.sourceEquipmentId ? lk.equipment.get(c.sourceEquipmentId) : undefined;
  const srcSvc = c.sourceServiceId ? services.find((s) => s.id === c.sourceServiceId) : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        {next.title && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-lg border border-shu-200 bg-gradient-to-r from-shu-50 via-white to-white px-5 py-4 shadow-[var(--shadow-card)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-shu-500" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shu-500 text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <div className="text-[11px] font-medium tracking-wider text-shu-700">次のアクション（{stageDef(c.stage).label}）</div>
                  <div className="text-[15px] font-bold text-stone-900">{next.title}</div>
                  <div className="mt-0.5 text-xs text-stone-600">{next.body}</div>
                </div>
              </div>
              <Button variant={"accent" in next && next.accent ? "accent" : "primary"} onClick={next.onClick} disabled={"disabled" in next && next.disabled} icon={<ArrowRight size={15} />}>
                {next.label}
              </Button>
            </div>
          </motion.div>
        )}

        <Card>
          <CardHeader title="案件情報" actions={canEdit && <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEdit(true)}>編集</Button>} />
          <CardBody>
            <DL
              cols={3}
              items={[
                { label: "顧客", value: <Link href={`/customers/${c.customerId}`} className="text-ai-800 hover:underline">{cust?.name}</Link> },
                { label: "納入先拠点", value: `${site?.name ?? ""}（${site?.address ?? ""}）` },
                { label: "装置種別", value: EQUIPMENT_TYPES[c.equipmentType].label },
                { label: "引合日", value: fmtDate(c.inquiryDate) },
                { label: "引合経路", value: c.inquiryChannel },
                { label: c.order ? "納期" : "希望納期", value: fmtDate(c.order?.deliveryDate ?? c.desiredDeliveryDate) },
                { label: c.order ? "受注金額（税抜）" : "見込金額", value: <span className="font-num font-medium">{yen(price)}</span> },
                { label: "客先予算", value: c.budget ? <span className="font-num">{yen(c.budget)}</span> : "未確認" },
                { label: "確度", value: c.order ? "受注済" : `${c.probability}（${{ A: "高", B: "中", C: "低" }[c.probability]}）` },
                { label: "営業担当", value: <UserChip user={lk.user.get(c.salesRepId)} /> },
                { label: "設計担当", value: <UserChip user={c.engineerId ? lk.user.get(c.engineerId) : undefined} /> },
                { label: "客先注文番号", value: c.order?.customerPoNo ?? "—" },
                { label: "引合内容・ご要望", value: <span className="whitespace-pre-wrap leading-relaxed">{c.description || "—"}</span>, full: true },
                {
                  label: "タグ",
                  value: c.tags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">#{t}</span>
                      ))}
                    </div>
                  ) : "—",
                  full: true,
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="番号の紐付け（案件のライフサイクル）" description="取引番号から製造番号・サービス履歴まで、一つの案件として追跡できます" icon={<Link2 size={16} />} />
          <CardBody>
            <ol className="relative space-y-3 border-l-2 border-dashed border-stone-200 pl-6">
              <ChainItem tone="stone" label="取引番号" value={c.dealNo} sub={`${fmtDate(c.inquiryDate, false)} 引合登録`} />
              {caseQuotes.length === 0 ? (
                <ChainItem tone="none" label="見積番号" value="未作成" />
              ) : (
                caseQuotes.map((q) => (
                  <ChainItem
                    key={q.id}
                    tone="ai"
                    label={`見積番号 Rev.${q.revision}`}
                    value={q.quoteNo}
                    sub={<>{fmtDate(q.issueDate, false)}　<Badge className={QUOTE_STATUS[q.status].color}>{QUOTE_STATUS[q.status].label}</Badge></>}
                    onClick={() => goTab("quote")}
                  />
                ))
              )}
              <ChainItem tone={c.workNo ? "shu" : "none"} label="工事番号" value={c.workNo ?? "未発行"} sub={c.workNoIssuedAt ? `${fmtDateTime(c.workNoIssuedAt)} 発行` : "受注登録後に発行"} />
              {eqs.length === 0 ? (
                <ChainItem tone="none" label="製造番号（装置）" value="納品後に登録" />
              ) : (
                eqs.map((e) => <ChainItem key={e.id} tone="emerald" label="製造番号（装置）" value={e.serialNo} sub={`${e.name}／${e.location}`} href={`/equipment/${e.id}`} />)
              )}
              {svcs.length > 0 && <ChainItem tone="violet" label="アフターサービス" value={`${svcs.length}件`} sub={svcs.slice(0, 3).map((s) => s.ticketNo).join("、")} onClick={() => goTab("after")} />}
            </ol>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-stone-500">{c.order ? "受注金額" : "見込金額"}</div>
                <div className="font-num text-lg font-bold text-stone-900">{manYen(price)}</div>
              </div>
              <div>
                <div className="text-[11px] text-stone-500">{c.actualCost ? "実績粗利率" : "見積粗利率"}</div>
                <div className={cn("font-num text-lg font-bold", !canCost ? "text-stone-300" : price && 1 - cost / price < 0.2 ? "text-rose-600" : "text-emerald-700")}>{canCost ? (cost ? pct(1 - cost / price) : "—") : "＊＊＊"}</div>
              </div>
            </div>
            {c.processes.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-stone-500">
                  <span>製造進捗</span>
                  <span className="font-num">{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            )}
          </CardBody>
        </Card>

        {(srcEq || srcSvc) && (
          <Card className="border-violet-200">
            <CardHeader title="元装置・起点となったサービス" icon={<Wrench size={16} />} />
            <CardBody className="space-y-2 text-[13px]">
              {srcEq && (
                <Link href={`/equipment/${srcEq.id}`} className="block rounded-md bg-violet-50/70 px-3 py-2 hover:bg-violet-50">
                  <div className="font-num text-[11px] font-semibold text-violet-700">{srcEq.serialNo}</div>
                  <div className="font-medium">{srcEq.name}</div>
                  <div className="text-[11px] text-stone-500">納入 {fmtDate(srcEq.deliveredDate, false)}／{srcEq.location}</div>
                </Link>
              )}
              {srcSvc && (
                <Link href={`/service/${srcSvc.id}`} className="block rounded-md bg-stone-50 px-3 py-2 hover:bg-stone-100">
                  <div className="flex items-center gap-1.5">
                    <Badge className={SERVICE_TYPES[srcSvc.type].color}>{SERVICE_TYPES[srcSvc.type].label}</Badge>
                    <span className="font-num text-[11px] text-stone-500">{srcSvc.ticketNo}</span>
                  </div>
                  <div className="mt-0.5 font-medium">{srcSvc.title}</div>
                </Link>
              )}
            </CardBody>
          </Card>
        )}

        <NotesCard c={c} />

        {c.referenceCaseIds.length > 0 && (
          <Card>
            <CardHeader title="参考にした類似案件" icon={<Hash size={16} />} />
            <div>
              {c.referenceCaseIds.map((rid) => {
                const r = lk.case.get(rid);
                if (!r) return null;
                return (
                  <Link key={rid} href={`/cases/${rid}`} className="flex items-center gap-2 border-b border-stone-50 px-5 py-2.5 text-[13px] transition-colors last:border-0 hover:bg-stone-50">
                    <span className="font-num text-[11px] font-semibold text-shu-600">{r.workNo ?? r.dealNo}</span>
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="text-[11px] text-stone-400">{lk.customer.get(r.customerId)?.name.replace(/株式会社|有限会社/g, "")}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="案件メンバー" icon={<Users size={16} />} />
          <CardBody className="space-y-2">
            {[
              ["営業", c.salesRepId],
              ["設計", c.engineerId],
              ["購買", c.workNo ? "u06" : undefined],
              ["製造", c.workNo ? "u07" : undefined],
            ].map(([role, uid]) => (
              <div key={role} className="flex items-center justify-between text-[13px]">
                <span className="w-10 text-[11px] text-stone-500">{role}</span>
                <span className="flex-1">
                  <UserChip user={uid ? lk.user.get(uid) : undefined} sub />
                </span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-stone-500">メンバーには Google Drive の案件フォルダが自動共有されます。</p>
          </CardBody>
        </Card>
      </div>
      <EditCaseModal c={c} open={edit} onClose={() => setEdit(false)} />
    </div>
  );
}

function ChainItem({ tone, label, value, sub, href, onClick }: { tone: "stone" | "ai" | "shu" | "emerald" | "violet" | "none"; label: string; value: string; sub?: React.ReactNode; href?: string; onClick?: () => void }) {
  const dot = { stone: "bg-stone-500", ai: "bg-ai-600", shu: "bg-shu-500", emerald: "bg-emerald-600", violet: "bg-violet-600", none: "bg-white border-2 border-stone-300" }[tone];
  const inner = (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-0.5", (href || onClick) && "cursor-pointer")}>
      <span className="w-32 shrink-0 text-[11px] text-stone-500">{label}</span>
      <span className={cn("font-num text-[14px] font-bold", tone === "none" ? "text-stone-300" : "text-stone-800")}>{value}</span>
      {sub && <span className="text-[11px] text-stone-500">{sub}</span>}
    </div>
  );
  return (
    <li className="relative">
      <span className={cn("absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white", dot)} />
      {href ? (
        <Link href={href} className="hover:opacity-80">{inner}</Link>
      ) : onClick ? (
        <button onClick={onClick} className="text-left hover:opacity-80">{inner}</button>
      ) : (
        inner
      )}
    </li>
  );
}

function NotesCard({ c }: { c: Case }) {
  const addNote = useStore((s) => s.addNote);
  const togglePin = useStore((s) => s.toggleNotePin);
  const del = useStore((s) => s.deleteNote);
  const me = useCurrentUser();
  const lk = useLookups();
  const [text, setText] = useState("");
  const notes = [...c.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at));
  return (
    <Card>
      <CardHeader title="引継ぎメモ・申し送り" description="担当者の経験・客先の要望を記録し、属人化を防ぎます" />
      <CardBody className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="客先キーマン、過去の指摘事項、注意点など"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) {
                addNote(c.id, text.trim());
                setText("");
              }
            }}
          />
          <Button
            variant="primary"
            className="self-end"
            icon={<Send size={14} />}
            disabled={!text.trim()}
            onClick={() => {
              addNote(c.id, text.trim());
              setText("");
              toast.success("メモを追加しました");
            }}
          >
            追加
          </Button>
        </div>
        {notes.length === 0 && <div className="py-3 text-center text-xs text-stone-400">メモはまだありません</div>}
        {notes.map((n) => {
          const u = lk.user.get(n.userId);
          return (
            <motion.div layout key={n.id} className={cn("group rounded-md px-3 py-2.5", n.pinned ? "bg-amber-50 ring-1 ring-amber-200" : "bg-stone-50")}>
              <div className="flex items-center gap-2">
                <Avatar user={u} size={20} className="ring-0" />
                <span className="text-xs font-medium">{u?.name}</span>
                <span className="text-[10px] text-stone-400">{relTime(n.at)}</span>
                <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => togglePin(c.id, n.id)} className="rounded p-1 text-stone-400 hover:bg-white hover:text-amber-600" title={n.pinned ? "固定を解除" : "固定する"}>
                    {n.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  {n.userId === me?.id && (
                    <button onClick={() => del(c.id, n.id)} className="rounded p-1 text-stone-400 hover:bg-white hover:text-rose-600" title="削除">
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-stone-700">
                {n.pinned && <Pin size={11} className="mr-1 inline text-amber-600" />}
                {n.text}
              </p>
            </motion.div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function EditCaseModal({ c, open, onClose }: { c: Case; open: boolean; onClose: () => void }) {
  const users = useStore((s) => s.users);
  const update = useStore((s) => s.updateCase);
  const [f, setF] = useState(() => ({ ...c }));
  const [tags, setTags] = useState(c.tags.join("、"));
  useEffect(() => {
    if (open) {
      setF({ ...c });
      setTags(c.tags.join("、"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="案件情報の編集"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!f.title.trim()) return toast.error("案件名を入力してください");
              update(c.id, { title: f.title.trim(), salesRepId: f.salesRepId, engineerId: f.engineerId || undefined, inquiryChannel: f.inquiryChannel, desiredDeliveryDate: f.desiredDeliveryDate, budget: f.budget, expectedAmount: f.expectedAmount, probability: f.probability, description: f.description, tags: tags.split(/[、,，\s]+/).filter(Boolean) }, "案件情報を更新しました");
              toast.success("案件情報を保存しました");
              onClose();
            }}
          >
            保存する
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="案件名" required className="sm:col-span-2">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="営業担当">
          <Select value={f.salesRepId} onChange={(e) => setF({ ...f, salesRepId: e.target.value })}>
            {users.filter((u) => u.role === "sales").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="設計担当">
          <Select value={f.engineerId ?? ""} onChange={(e) => setF({ ...f, engineerId: e.target.value })}>
            <option value="">未定</option>
            {users.filter((u) => u.role === "engineer").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="引合経路">
          <Select value={f.inquiryChannel} onChange={(e) => setF({ ...f, inquiryChannel: e.target.value })}>
            {INQUIRY_CHANNELS.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="希望納期">
          <Input type="date" value={f.desiredDeliveryDate ?? ""} onChange={(e) => setF({ ...f, desiredDeliveryDate: e.target.value })} />
        </Field>
        <Field label="客先予算">
          <NumberInput value={f.budget} onChange={(v) => setF({ ...f, budget: v || undefined })} suffix="円" />
        </Field>
        <Field label="見込金額">
          <NumberInput value={f.expectedAmount} onChange={(v) => setF({ ...f, expectedAmount: v })} suffix="円" disabled={!!c.order} />
        </Field>
        <Field label="確度">
          <Select value={f.probability} onChange={(e) => setF({ ...f, probability: e.target.value as "A" | "B" | "C" })} disabled={!!c.order}>
            <option value="A">A（高）</option>
            <option value="B">B（中）</option>
            <option value="C">C（低）</option>
          </Select>
        </Field>
        <Field label="タグ（「、」区切り）">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Field label="引合内容・ご要望" className="sm:col-span-2">
          <Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
