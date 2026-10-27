"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, FilePlus2, Plus, Printer, Send, Stamp, Trash2, Undo2, UserCog, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { can, useCurrentUser, useLookups } from "@/lib/hooks";
import { cn, fmtDate, pct, quoteCost, quoteSubtotal, uid, yen } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/constants";
import type { Quote } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, NumberInput, Textarea } from "@/components/ui/form";
import { ApprovalStamps, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";

export function QuoteTab({ c, goTab }: CaseTabProps) {
  const quotes = useStore((s) => s.quotes);
  const createQuote = useStore((s) => s.createQuote);
  const me = useCurrentUser();
  const canEdit = can(me, "editCase");
  const list = useMemo(() => quotes.filter((q) => q.caseId === c.id).sort((a, b) => b.revision - a.revision), [quotes, c.id]);
  const [sel, setSel] = useState<string | undefined>(list[0]?.id);
  useEffect(() => {
    if (!sel || !list.find((q) => q.id === sel)) setSel(list[0]?.id);
  }, [list, sel]);
  const q = list.find((x) => x.id === sel);

  if (list.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FilePlus2 size={22} />}
          title="見積書はまだ作成されていません"
          description="顧客名・件名・納入場所・支払条件・見積原価は案件情報から自動で転記されます。同じ情報を何度も入力する必要はありません。"
          action={
            canEdit ? (
              <Button
                variant="accent"
                icon={<FilePlus2 size={15} />}
                onClick={() => {
                  const id = createQuote(c.id);
                  setSel(id);
                  toast.success("見積書（Rev.1）を作成しました");
                }}
              >
                案件情報から見積書を作成
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {list.map((x) => (
          <button
            key={x.id}
            onClick={() => setSel(x.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
              x.id === sel ? "border-ai-500 bg-surface shadow-md ring-2 ring-ai-500/15" : "border-stone-200 bg-surface/70 hover:border-stone-300 hover:bg-surface",
            )}
          >
            <span>
              <span className="font-num block text-[0.75rem] font-bold text-stone-800">{x.quoteNo}</span>
              <span className="font-num block text-[0.6875rem] text-stone-500">{yen(quoteSubtotal(x))}</span>
            </span>
            <Badge className={QUOTE_STATUS[x.status].color}>{QUOTE_STATUS[x.status].label}</Badge>
          </button>
        ))}
        {canEdit && (
          <Button
            icon={<Copy size={14} />}
            onClick={() => {
              const id = createQuote(c.id, sel);
              setSel(id);
              toast.success("改訂版を作成しました", { description: "選択中の見積をコピーしています" });
            }}
          >
            改訂版を作成
          </Button>
        )}
      </div>
      {q && <QuoteEditor key={q.id} q={q} goReview={() => goTab("review")} />}
    </div>
  );
}

function QuoteEditor({ q, goReview }: { q: Quote; goReview: () => void }) {
  const update = useStore((s) => s.updateQuote);
  const del = useStore((s) => s.deleteQuote);
  const requestApproval = useStore((s) => s.requestQuoteApproval);
  const approve = useStore((s) => s.approveQuote);
  const reject = useStore((s) => s.rejectQuote);
  const submit = useStore((s) => s.submitQuote);
  const setStatus = useStore((s) => s.setQuoteStatus);
  const setUser = useStore((s) => s.setCurrentUser);
  const users = useStore((s) => s.users);
  const taxRate = useStore((s) => s.settings.taxRate);
  const me = useCurrentUser();
  const lk = useLookups();
  const c = lk.case.get(q.caseId)!;
  const cust = lk.customer.get(c.customerId);
  const editable = q.status === "draft" && can(me, "editCase");
  const showCost = can(me, "viewCost");
  const [confirmDel, setConfirmDel] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMsg, setRejectMsg] = useState("");

  const subtotal = quoteSubtotal(q);
  const cost = quoteCost(q);
  const margin = subtotal ? 1 - cost / subtotal : 0;
  const tax = Math.floor(subtotal * taxRate);
  const next = q.approvals.find((a) => a.status === "waiting");
  const canApprove = q.status === "pending" && next && can(me, "approve") && me.approvalLevel >= next.level;
  const suggest = next ? users.find((u) => u.role === "sales" && u.approvalLevel === next.level) ?? users.find((u) => u.approvalLevel >= next.level && can(u, "approve")) : undefined;

  const setItem = (id: string, patch: Partial<Quote["items"][number]>) => update(q.id, { items: q.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              御見積書 <span className="font-num text-stone-500">{q.quoteNo}</span>
              <Badge className={QUOTE_STATUS[q.status].color}>{QUOTE_STATUS[q.status].label}</Badge>
            </span>
          }
          description={editable ? "入力内容は自動保存されます" : "承認申請後は編集できません（改訂版を作成してください）"}
          actions={
            <>
              <Button size="sm" icon={<Printer size={13} />} onClick={() => window.open(`/print/quote/${q.id}`, "_blank")}>
                印刷・PDF
              </Button>
              {editable && (
                <IconButton label="削除" onClick={() => setConfirmDel(true)}>
                  <Trash2 size={15} />
                </IconButton>
              )}
            </>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="宛先">
              <Input value={`${cust?.name ?? ""} 御中`} disabled />
            </Field>
            <Field label="件名" className="sm:col-span-2">
              <Input value={q.subject} disabled={!editable} onChange={(e) => update(q.id, { subject: e.target.value })} />
            </Field>
            <Field label="見積日">
              <Input type="date" value={q.issueDate} disabled={!editable} onChange={(e) => update(q.id, { issueDate: e.target.value })} />
            </Field>
            <Field label="有効期限">
              <Input type="date" value={q.validUntil} disabled={!editable} onChange={(e) => update(q.id, { validUntil: e.target.value })} />
            </Field>
            <Field label="納期">
              <Input value={q.deliveryTerms} disabled={!editable} onChange={(e) => update(q.id, { deliveryTerms: e.target.value })} />
            </Field>
            <Field label="受渡場所">
              <Input value={q.deliveryPlace} disabled={!editable} onChange={(e) => update(q.id, { deliveryPlace: e.target.value })} />
            </Field>
            <Field label="お支払条件" className="sm:col-span-2">
              <Input value={q.paymentTerms} disabled={!editable} onChange={(e) => update(q.id, { paymentTerms: e.target.value })} />
            </Field>
          </div>

          <div className="scroll-thin overflow-x-auto rounded-md border border-stone-200">
            <table className="tbl tbl-compact" style={{ width: (showCost ? 1060 : 870) + (editable ? 40 : 0), tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th className="w-10">No.</th>
                  <th className="w-[230px]">品名</th>
                  <th className="w-[200px]">仕様・摘要</th>
                  <th className="w-20 text-right">数量</th>
                  <th className="w-14">単位</th>
                  <th className="w-32 text-right">単価</th>
                  <th className="w-32 text-right">金額</th>
                  {showCost && <th className="w-32 text-right">原価（単価）</th>}
                  {showCost && <th className="w-16 text-right">粗利率</th>}
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {q.items.map((it, i) => {
                  const m = it.unitPrice ? 1 - it.unitCost / it.unitPrice : 0;
                  return (
                    <tr key={it.id}>
                      <td className="font-num text-center text-xs text-stone-400">{i + 1}</td>
                      <td>
                        <input className="cell-input font-medium" value={it.name} disabled={!editable} onChange={(e) => setItem(it.id, { name: e.target.value })} />
                      </td>
                      <td>
                        <input className="cell-input text-xs" value={it.spec} disabled={!editable} onChange={(e) => setItem(it.id, { spec: e.target.value })} />
                      </td>
                      <td>
                        <NumberInput compact value={it.qty} onChange={(v) => setItem(it.id, { qty: v })} disabled={!editable} min={0} />
                      </td>
                      <td>
                        <input className="cell-input" value={it.unit} disabled={!editable} onChange={(e) => setItem(it.id, { unit: e.target.value })} />
                      </td>
                      <td>
                        <NumberInput compact value={it.unitPrice} onChange={(v) => setItem(it.id, { unitPrice: v })} disabled={!editable} />
                      </td>
                      <td className="font-num text-right font-medium">{yen(it.qty * it.unitPrice)}</td>
                      {showCost && (
                        <td>
                          <NumberInput compact value={it.unitCost} onChange={(v) => setItem(it.id, { unitCost: v })} disabled={!editable} />
                        </td>
                      )}
                      {showCost && <td className={cn("font-num text-right text-xs", it.unitPrice && m < 0.2 ? "text-rose-600" : "text-stone-600")}>{it.unitPrice ? pct(m, 0) : "—"}</td>}
                      {editable && (
                        <td>
                          <IconButton label="行を削除" className="h-6 w-6" onClick={() => update(q.id, { items: q.items.filter((x) => x.id !== it.id) })}>
                            <Trash2 size={13} />
                          </IconButton>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {editable && (
              <button
                onClick={() => update(q.id, { items: [...q.items, { id: uid("qi"), name: "", spec: "", qty: 1, unit: "式", unitPrice: 0, unitCost: 0 }] })}
                className="flex w-full items-center justify-center gap-1 border-t border-dashed border-stone-200 py-2 text-xs text-ai-700 transition-colors hover:bg-ai-50"
              >
                <Plus size={13} />
                明細行を追加
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <Field label="備考" className="min-w-[280px] flex-1">
              <Textarea rows={4} value={q.notes} disabled={!editable} onChange={(e) => update(q.id, { notes: e.target.value })} />
            </Field>
            <div className="w-full max-w-xs space-y-1.5 rounded-lg bg-kinari p-4 text-[0.8125rem]">
              <div className="flex justify-between">
                <span className="text-stone-500">小計</span>
                <span className="font-num">{yen(subtotal + (q.discount || 0))}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500">出精値引き</span>
                {editable ? <NumberInput compact value={q.discount} onChange={(v) => update(q.id, { discount: v })} className="w-32" /> : <span className="font-num">{q.discount ? `△${yen(q.discount)}` : "—"}</span>}
              </div>
              <div className="flex justify-between border-t border-stone-300 pt-1.5 font-bold">
                <span>合計（税抜）</span>
                <span className="font-num">{yen(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>消費税（{Math.round(taxRate * 100)}%）</span>
                <span className="font-num">{yen(tax)}</span>
              </div>
              <div className="flex justify-between text-[0.9375rem] font-bold text-ai-900">
                <span>総額（税込）</span>
                <span className="font-num">{yen(subtotal + tax)}</span>
              </div>
              {showCost && (
                <div className="mt-2 flex justify-between border-t border-dashed border-stone-300 pt-2 text-xs">
                  <span className="text-stone-500">原価合計／粗利率</span>
                  <span className={cn("font-num font-medium", margin < 0.2 ? "text-rose-600" : "text-emerald-700")}>
                    {yen(cost)}／{pct(margin)}
                  </span>
                </div>
              )}
            </div>
          </div>
          {showCost && subtotal > 0 && margin < 0.2 && (
            <div className="flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle size={14} />
              粗利率が社内基準（20%）を下回っています。部長承認時に理由の記載が必要です。
            </div>
          )}
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="社内承認" icon={<Stamp size={16} />} />
          <CardBody className="space-y-4">
            <div className="flex justify-center">
              <ApprovalStamps steps={q.approvals} users={lk.user} />
            </div>
            {q.approvals.some((a) => a.comment) && (
              <div className="space-y-1">
                {q.approvals.filter((a) => a.comment).map((a, i) => (
                  <div key={i} className={cn("rounded-sm px-2 py-1.5 text-xs", a.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-stone-50 text-stone-600")}>
                    {a.label}（{lk.user.get(a.userId ?? "")?.name}）：{a.comment}
                  </div>
                ))}
              </div>
            )}

            {q.status === "draft" && (
              <Button
                variant="primary"
                className="w-full"
                icon={<Send size={14} />}
                disabled={!can(me, "editCase") || q.items.length === 0}
                onClick={() => {
                  requestApproval(q.id);
                  toast.success("承認を申請しました", { description: "課長に通知しました" });
                }}
              >
                承認を申請する
              </Button>
            )}

            {q.status === "pending" && next && (
              <div className="space-y-2">
                <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  現在：<b>{next.label}</b>承認待ち
                </div>
                {canApprove ? (
                  <div className="flex gap-2">
                    <Button
                      variant="accent"
                      className="flex-1"
                      icon={<Stamp size={14} />}
                      onClick={() => {
                        approve(q.id);
                        toast.success(`${next.label}として承認しました`);
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
                      {me.name}さんには{next.label}承認の権限がありません。
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        icon={<UserCog size={14} />}
                        onClick={() => {
                          setUser(suggest.id);
                          toast.info(`${suggest.name}（${suggest.title}）に切り替えました`);
                        }}
                      >
                        {suggest.name}（{suggest.title}）に切替える
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}

            {q.status === "approved" && (
              <Button
                variant="accent"
                className="w-full"
                icon={<Send size={14} />}
                disabled={!can(me, "editCase")}
                onClick={() => {
                  submit(q.id);
                  toast.success("見積書を客先へ提出しました", { description: "PDF を Drive の「01_引合・見積」に保存しました" });
                }}
              >
                客先へ提出する
              </Button>
            )}

            {q.status === "submitted" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                  <CheckCircle2 size={14} />
                  {fmtDate(q.issueDate)} に提出済みです
                </div>
                {c.status === "active" && !c.order && (
                  <>
                    <Button variant="primary" className="w-full" icon={<ClipboardCheck size={14} />} onClick={goReview}>
                      取引審査へ進む
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      icon={<XCircle size={13} />}
                      disabled={!can(me, "editCase")}
                      onClick={() => {
                        setStatus(q.id, "declined");
                        toast("見積を不採用として記録しました");
                      }}
                    >
                      不採用として記録
                    </Button>
                  </>
                )}
              </div>
            )}
            {q.status === "accepted" && <div className="rounded-md bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">この見積で受注しました</div>}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-xs leading-relaxed text-stone-600">
            <div className="mb-1 font-bold text-stone-700">承認ルール（デモ設定）</div>
            担当 → 課長 → 部長 の3段階承認です。役職に応じて押印できる段階が異なります。右上のユーザー切替で、課長（高橋）・部長（佐藤）として承認を体験できます。
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { del(q.id); toast.success("見積を削除しました"); }} title="見積の削除" message={`${q.quoteNo} を削除します。よろしいですか？`} confirmLabel="削除する" danger />
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="見積の差戻し"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRejectOpen(false)}>キャンセル</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!rejectMsg.trim()) return toast.error("差戻し理由を入力してください");
                reject(q.id, rejectMsg.trim());
                setRejectOpen(false);
                setRejectMsg("");
                toast("差戻しました");
              }}
            >
              差戻す
            </Button>
          </>
        }
      >
        <Field label="差戻し理由" required>
          <Textarea rows={3} value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)} placeholder="例：輸送費の根拠を明記してください" />
        </Field>
      </Modal>
    </div>
  );
}
