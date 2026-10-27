"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Handshake, Minus, Send, Stamp, Undo2, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { can, useCurrentUser, useLookups } from "@/lib/hooks";
import { cn, costTotal, daysFromToday, fmtDateTime, manYen, pct, quoteCost, quoteSubtotal } from "@/lib/format";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { ApprovalStamps, LockedNotice } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export function ReviewTab({ c, openOrder }: CaseTabProps) {
  const quotes = useStore((s) => s.quotes);
  const cases = useStore((s) => s.cases);
  const services = useStore((s) => s.services);
  const equipment = useStore((s) => s.equipment);
  const users = useStore((s) => s.users);
  const updateReview = useStore((s) => s.updateReview);
  const requestReview = useStore((s) => s.requestReview);
  const approveReview = useStore((s) => s.approveReview);
  const rejectReview = useStore((s) => s.rejectReview);
  const setUser = useStore((s) => s.setCurrentUser);
  const me = useCurrentUser();
  const lk = useLookups();
  const cust = lk.customer.get(c.customerId)!;
  const r = c.review;
  const editable = (r.status === "none" || r.status === "rejected") && can(me, "editCase") && c.status === "active";
  const showCost = can(me, "viewCost");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const m = useMemo(() => {
    const q = quotes.filter((x) => x.caseId === c.id && x.status !== "draft").sort((a, b) => b.revision - a.revision)[0];
    const amount = q ? quoteSubtotal(q) : c.expectedAmount;
    const qc = q ? quoteCost(q) : costTotal(c.costEstimate);
    const margin = amount ? 1 - qc / amount : 0;
    const openOrders = cases.filter((x) => x.customerId === c.customerId && x.order && x.stage !== "aftercare" && x.id !== c.id).reduce((s, x) => s + x.order!.orderAmount, 0);
    const exposure = openOrders + amount;
    const past = cases.filter((x) => x.customerId === c.customerId && x.stage === "aftercare");
    const eqIds = equipment.filter((e) => e.customerId === c.customerId).map((e) => e.id);
    const svc = services.filter((s) => eqIds.includes(s.equipmentId)).length;
    const days = daysFromToday(c.desiredDeliveryDate);
    return { q, amount, margin, openOrders, exposure, past, svc, days };
  }, [quotes, cases, services, equipment, c]);

  const next = r.approvals.find((a) => a.status === "waiting");
  const canApprove = r.status === "pending" && next && can(me, "approve") && me.approvalLevel >= next.level;
  const suggest = next ? users.find((u) => u.approvalLevel >= next.level && can(u, "approve") && (next.level < 2 ? u.role === "sales" : u.role === "executive")) : undefined;
  const allAnswered = r.checks.every((x) => x.ok !== null);

  const metrics = [
    { label: "与信ランク", value: cust.creditRank, warn: cust.creditRank === "C" || cust.creditRank === "D" },
    { label: "与信限度額", value: manYen(cust.creditLimit) },
    { label: "本件を含む受注残", value: manYen(m.exposure), warn: m.exposure > cust.creditLimit, note: m.exposure > cust.creditLimit ? "限度額超過" : `残枠 ${manYen(cust.creditLimit - m.exposure)}` },
    { label: "見積金額（最新）", value: manYen(m.amount), note: m.q?.quoteNo },
    { label: "見積粗利率", value: showCost ? pct(m.margin) : "＊＊＊", warn: showCost && m.margin < 0.25 },
    { label: "希望納期まで", value: m.days !== undefined ? `${m.days}日` : "—", warn: m.days !== undefined && m.days < 150, note: "標準リードタイム 150日" },
    { label: "過去の納入実績", value: `${m.past.length}件`, note: `アフター対応 ${m.svc}件` },
    { label: "支払条件", value: cust.paymentTerms, small: true },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="審査サマリー" description="顧客マスタ・見積・受注残から自動集計しています" icon={<ClipboardCheck size={16} />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map((x) => (
                <div key={x.label} className={cn("rounded-lg border px-3 py-2.5", x.warn ? "border-rose-200 bg-rose-50/60" : "border-stone-200 bg-stone-50/50")}>
                  <div className="text-[0.6875rem] text-stone-500">{x.label}</div>
                  <div className={cn("font-num font-bold", x.small ? "text-xs" : "text-[0.9375rem]", x.warn ? "text-rose-700" : "text-stone-900")}>{x.value}</div>
                  {x.note && <div className="text-[0.625rem] text-stone-500">{x.note}</div>}
                </div>
              ))}
            </div>
            {cust.notes && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">顧客メモ：{cust.notes}</div>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="審査チェックリスト" description={editable ? "各項目を確認してください" : r.status === "pending" ? "申請済みのため編集できません" : undefined} />
          <div>
            {r.checks.map((chk, i) => (
              <div key={chk.label} className="flex items-center justify-between gap-3 border-b border-stone-50 px-5 py-2.5 last:border-0">
                <span className="text-[0.8125rem] text-stone-700">{chk.label}</span>
                <div className="flex shrink-0 gap-1">
                  {[
                    { v: true, label: "適合", icon: <Check size={13} />, on: "bg-emerald-600 text-white ring-emerald-600" },
                    { v: false, label: "要注意", icon: <X size={13} />, on: "bg-rose-600 text-white ring-rose-600" },
                    { v: null, label: "未確認", icon: <Minus size={13} />, on: "bg-stone-500 text-white ring-stone-500" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      disabled={!editable}
                      onClick={() => updateReview(c.id, { checks: r.checks.map((x, j) => (j === i ? { ...x, ok: o.v } : x)) })}
                      className={cn("inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[0.6875rem] ring-1 ring-inset transition-all disabled:cursor-default", chk.ok === o.v ? o.on : "bg-surface text-stone-500 ring-stone-200 hover:ring-stone-400")}
                    >
                      {o.icon}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <CardBody className="border-t border-stone-100">
            <Field label="リスク・特記事項">
              <Textarea rows={3} value={r.riskNotes} disabled={!editable} onChange={(e) => updateReview(c.id, { riskNotes: e.target.value })} placeholder="例：与信ランクC のため着手金30%を条件とする" />
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="審査承認"
            icon={<Stamp size={16} />}
            actions={
              <Badge className={r.status === "approved" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : r.status === "pending" ? "bg-amber-50 text-amber-800 ring-amber-200" : r.status === "rejected" ? "bg-rose-50 text-rose-700 ring-rose-200" : undefined}>
                {{ none: "未申請", pending: "審査中", approved: "承認済", rejected: "差戻し" }[r.status]}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            {r.approvals.length > 0 ? (
              <div className="flex justify-center">
                <ApprovalStamps steps={r.approvals.map((a, i) => ({ ...a, label: i === 2 ? "役員" : a.label }))} users={lk.user} />
              </div>
            ) : (
              <p className="text-center text-xs text-stone-500">申請すると、課長 → 役員 の順に承認依頼が届きます</p>
            )}
            {r.requestedAt && <p className="text-center text-[0.6875rem] text-stone-500">申請：{lk.user.get(r.requestedBy ?? "")?.name}（{fmtDateTime(r.requestedAt)}）</p>}
            {r.approvals.filter((a) => a.comment).map((a, i) => (
              <div key={i} className={cn("rounded-sm px-2 py-1.5 text-xs", a.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-stone-50 text-stone-600")}>
                {lk.user.get(a.userId ?? "")?.name}：{a.comment}
              </div>
            ))}

            {editable && (
              <>
                {!allAnswered && (
                  <div className="flex items-start gap-1.5 text-[0.6875rem] text-amber-700">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    未確認の項目があります。すべて確認してから申請してください。
                  </div>
                )}
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Send size={14} />}
                  disabled={!allAnswered}
                  onClick={() => {
                    requestReview(c.id);
                    toast.success("取引審査を申請しました");
                  }}
                >
                  取引審査を申請する
                </Button>
              </>
            )}
            {r.status === "none" && !can(me, "editCase") && <LockedNotice message="申請は営業担当者が行います" />}

            {r.status === "pending" && next && (
              canApprove ? (
                <div className="flex gap-2">
                  <Button
                    variant="accent"
                    className="flex-1"
                    icon={<Stamp size={14} />}
                    onClick={() => {
                      approveReview(c.id);
                      toast.success("承認しました");
                    }}
                  >
                    承認（押印）
                  </Button>
                  <Button variant="danger" icon={<Undo2 size={14} />} onClick={() => setRejectOpen(true)}>
                    差戻し
                  </Button>
                </div>
              ) : (
                suggest && (
                  <div className="rounded-md border border-dashed border-stone-300 p-3 text-xs text-stone-600">
                    {next.level === 2 ? "役員" : next.label}承認待ちです。{me.name}さんには承認権限がありません。
                    <Button size="sm" className="mt-2 w-full" icon={<UserCog size={14} />} onClick={() => { setUser(suggest.id); toast.info(`${suggest.name}（${suggest.title}）に切り替えました`); }}>
                      {suggest.name}（{suggest.title}）に切替える
                    </Button>
                  </div>
                )
              )
            )}

            {r.status === "approved" && !c.order && c.status === "active" && (
              <Button variant="accent" size="lg" className="w-full" icon={<Handshake size={16} />} onClick={openOrder} disabled={!can(me, "editCase")}>
                受注登録へ進む
              </Button>
            )}
            {c.order && <div className="rounded-md bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">受注登録済み（{c.order.customerPoNo}）</div>}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="取引審査の差戻し"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRejectOpen(false)}>キャンセル</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!msg.trim()) return toast.error("差戻し理由を入力してください");
                rejectReview(c.id, msg.trim());
                setRejectOpen(false);
                setMsg("");
              }}
            >
              差戻す
            </Button>
          </>
        }
      >
        <Field label="差戻し理由" required>
          <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
