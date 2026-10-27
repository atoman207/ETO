"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardPaste,
  Copy,
  Download,
  FolderPlus,
  Layers,
  Lock,
  PackagePlus,
  Plus,
  ShoppingCart,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { addDays, bomChildren, bomRollup, bomTotal, cn, diffDays, fmtDate, pct, today, yen } from "@/lib/format";
import { PO_STATUS, PROCUREMENT } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import type { BomItem, Case, Procurement } from "@/lib/types";
import type { CaseTabProps } from "../tab-types";
import { Card } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { CopyFromCaseModal, ImportModal, PartPickerModal, SaveTemplateModal, TemplateModal } from "@/components/bom/bom-modals";

interface Row {
  item: BomItem;
  depth: number;
  no: string;
  hasChildren: boolean;
}

function flatten(items: BomItem[], collapsed: Set<string>) {
  const out: Row[] = [];
  const walk = (pid: string | null, depth: number, prefix: string) => {
    bomChildren(items, pid).forEach((it, i) => {
      const no = prefix ? `${prefix}-${i + 1}` : `${i + 1}`;
      const hasChildren = items.some((x) => x.parentId === it.id);
      out.push({ item: it, depth, no, hasChildren });
      if (hasChildren && !collapsed.has(it.id)) walk(it.id, depth + 1, no);
    });
  };
  walk(null, 0, "");
  return out;
}

export function BomTab({ c, goTab }: CaseTabProps) {
  const canEdit = useCan("editBom");
  const canPurchase = useCan("purchase");
  const showCost = useCan("viewCost");
  const parts = useStore((s) => s.parts);
  const suppliers = useStore((s) => s.suppliers);
  const pos = useStore((s) => s.purchaseOrders);
  const addItem = useStore((s) => s.addBomItem);
  const updateItem = useStore((s) => s.updateBomItem);
  const deleteItem = useStore((s) => s.deleteBomItem);
  const moveItem = useStore((s) => s.moveBomItem);
  const createPR = useStore((s) => s.createPurchaseRequests);
  const lk = useLookups();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | "copy" | "tpl" | "parts" | "import">(null);
  const [tplRoot, setTplRoot] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<BomItem | null>(null);

  const rows = useMemo(() => flatten(c.bom, collapsed), [c.bom, collapsed]);
  const qty = c.order?.quantity ?? 1;

  const stats = useMemo(() => {
    const parentIds = new Set(c.bom.map((b) => b.parentId).filter(Boolean));
    const leaves = c.bom.filter((b) => !parentIds.has(b.id));
    const buy = leaves.filter((b) => b.procurement === "buy");
    const ordered = buy.filter((b) => b.poId);
    const pending = buy.filter((b) => !b.poId);
    const maxLt = pending.reduce((m, b) => Math.max(m, b.leadTimeDays ?? 0), 0);
    const total = bomTotal(c.bom) * qty;
    const est = c.costEstimate.material + c.costEstimate.purchased;
    const unregistered = leaves.filter((b) => b.partNo && !parts.some((p) => p.partNo === b.partNo)).length;
    const arrival = maxLt ? addDays(today(), maxLt) : undefined;
    const assemblyStart = c.order ? addDays(c.order.deliveryDate, -45) : undefined;
    const critical = arrival && assemblyStart ? diffDays(arrival, assemblyStart) > 0 : false;
    return { leaves: leaves.length, buy: buy.length, ordered: ordered.length, pending: pending.length, noSupplier: pending.filter((b) => !b.supplierId).length, maxLt, total, est, unregistered, arrival, critical };
  }, [c, qty, parts]);

  const onPartNo = (it: BomItem, value: string) => {
    const p = parts.find((x) => x.partNo.toLowerCase() === value.trim().toLowerCase());
    if (p) {
      updateItem(c.id, it.id, { partNo: p.partNo, name: p.name, spec: p.spec, maker: p.maker, unit: p.unit, unitCost: p.standardCost, supplierId: p.supplierId, leadTimeDays: p.leadTimeDays, procurement: p.procurement });
      if (p.partNo !== it.partNo || !it.name) toast.success(`品目マスタから補完しました：${p.name}`);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `BOM_${c.workNo ?? c.dealNo}.csv`,
      ["No.", "品番", "品名", "型式・仕様", "材質", "メーカー", "数量", "単位", "単価", "金額", "手配区分", "仕入先", "LT(日)", "発注番号", "備考"],
      flatten(c.bom, new Set()).map(({ item: b, no, hasChildren }) => [
        no,
        b.partNo,
        b.name,
        b.spec,
        b.material,
        b.maker,
        b.qty,
        b.unit,
        hasChildren || !showCost ? (showCost ? "" : "＊＊＊") : b.unitCost,
        showCost ? bomRollup(c.bom, b.id) : "＊＊＊",
        PROCUREMENT[b.procurement].label,
        b.supplierId ? lk.supplier.get(b.supplierId)?.name : "",
        b.leadTimeDays ?? "",
        b.poId ? pos.find((p) => p.id === b.poId)?.poNo : "",
        b.note,
      ]),
    );

  if (!c.workNo) {
    return (
      <Card className="px-6 py-14 text-center">
        <div className="text-sm font-medium text-stone-700">BOMは工事番号の発行後に作成できます</div>
        <p className="mt-1 text-xs text-stone-500">受注前の概算は「原価」タブで類似案件をもとに算出してください。</p>
        <Button className="mt-4" onClick={() => goTab("cost")}>原価タブへ</Button>
      </Card>
    );
  }

  const toolbar = canEdit && (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="primary" icon={<Copy size={14} />} onClick={() => setModal("copy")}>
        類似案件から流用
      </Button>
      <Button size="sm" icon={<Layers size={14} />} onClick={() => setModal("tpl")}>
        標準モジュール
      </Button>
      <Button size="sm" icon={<PackagePlus size={14} />} onClick={() => setModal("parts")}>
        品目マスタから追加
      </Button>
      <Button size="sm" icon={<ClipboardPaste size={14} />} onClick={() => setModal("import")}>
        Excel貼付・CSV取込
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<FolderPlus size={14} />}
        onClick={() => {
          addItem(c.id, { name: "新規ユニット", unit: "式", procurement: "make", maker: "自社" }, null);
        }}
      >
        ユニット追加
      </Button>
    </div>
  );

  if (c.bom.length === 0) {
    const options = [
      { icon: <Copy size={22} />, title: "類似案件から流用", body: "過去の納入実績からユニット単位でコピー。最も効果の大きい方法です。", key: "copy" as const, primary: true },
      { icon: <Layers size={22} />, title: "標準モジュールを展開", body: "制御盤・安全柵など、よく使う構成をワンクリックで展開。", key: "tpl" as const },
      { icon: <ClipboardPaste size={22} />, title: "Excel・CSVから取込", body: "既存のExcel部品表やCADの部品表出力を貼り付けるだけ。", key: "import" as const },
      { icon: <PackagePlus size={22} />, title: "品目マスタから選択", body: "単価・仕入先・リードタイムが自動設定されます。", key: "parts" as const },
    ];
    return (
      <Card className="px-6 py-10">
        <div className="text-center">
          <div className="text-base font-bold text-stone-800">BOM（部品表）を作成しましょう</div>
          <p className="mt-1 text-xs text-stone-500">ゼロから入力する必要はありません。次の4つの方法を組み合わせて、入力負担を最小限にできます。</p>
        </div>
        <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {options.map((o, i) => (
            <motion.button
              key={o.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              disabled={!canEdit}
              onClick={() => setModal(o.key)}
              className={cn(
                "group rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] disabled:cursor-not-allowed disabled:opacity-60",
                o.primary ? "border-ai-300 bg-ai-50/60" : "border-stone-200 bg-surface",
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", o.primary ? "bg-ai-700 text-white" : "bg-stone-100 text-stone-600 group-hover:bg-ai-100 group-hover:text-ai-700")}>{o.icon}</span>
              <div className="mt-3 text-[0.8125rem] font-bold text-stone-800">{o.title}</div>
              <p className="mt-1 text-[0.6875rem] leading-relaxed text-stone-500">{o.body}</p>
              {o.primary && <span className="mt-2 inline-block rounded-sm bg-shu-500 px-1.5 text-[0.625rem] text-white">おすすめ</span>}
            </motion.button>
          ))}
        </div>
        {!canEdit && <p className="mt-4 text-center text-xs text-stone-500">BOMの編集は設計・購買部門のユーザーのみ可能です。</p>}
        <BomModals c={c} modal={modal} setModal={setModal} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "部品点数（末端品目）", value: `${stats.leaves}点`, sub: `全${c.bom.length}行` },
          { label: `BOM原価合計${qty > 1 ? `（${qty}台分）` : ""}`, value: showCost ? yen(stats.total) : "＊＊＊", sub: showCost && stats.est ? `見積（材料＋購入品）比 ${stats.total >= stats.est ? "+" : ""}${pct(stats.total / stats.est - 1)}` : undefined, warn: showCost && stats.total > stats.est * 1.05 },
          { label: "手配状況（購入品）", value: `${stats.ordered} / ${stats.buy}`, sub: stats.pending ? `未手配 ${stats.pending}点` : "すべて手配済", warn: false },
          { label: "未手配品の最長LT", value: stats.maxLt ? `${stats.maxLt}日` : "—", sub: stats.arrival ? `本日手配で ${fmtDate(stats.arrival, false)} 入荷` : undefined, warn: stats.critical },
          { label: "マスタ未登録品目", value: `${stats.unregistered}点`, sub: "マスタ管理で登録できます", warn: stats.unregistered > 0 },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-lg border bg-surface px-4 py-3 shadow-[var(--shadow-card)]", s.warn ? "border-amber-300" : "border-stone-200")}>
            <div className="text-[0.6875rem] text-stone-500">{s.label}</div>
            <div className="font-num text-lg font-bold text-stone-900">{s.value}</div>
            {s.sub && <div className={cn("text-[0.625rem]", s.warn ? "text-amber-700" : "text-stone-500")}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {stats.critical && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
          <Clock size={14} />
          長納期品の入荷予定が組立開始の目安（納期の45日前）を過ぎます。早期の購買依頼をおすすめします。
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
          {toolbar || <span className="text-xs text-stone-500">閲覧モード（BOMの編集は設計・購買部門のみ）</span>}
          <div className="flex items-center gap-1.5">
            <IconButton label="すべて展開" onClick={() => setCollapsed(new Set())}>
              <ChevronsUpDown size={15} />
            </IconButton>
            <IconButton label="すべて折りたたみ" onClick={() => setCollapsed(new Set(c.bom.filter((b) => c.bom.some((x) => x.parentId === b.id)).map((b) => b.id)))}>
              <ChevronsDownUp size={15} />
            </IconButton>
            <Button size="sm" icon={<Download size={14} />} onClick={exportCsv}>
              CSV
            </Button>
            {(canEdit || canPurchase) && (
              <Button
                size="sm"
                variant="accent"
                icon={<ShoppingCart size={14} />}
                disabled={stats.pending === 0}
                onClick={() => {
                  const r = createPR(c.id);
                  if (r.created) toast.success(`購買依頼を${r.created}件作成しました`, { description: r.skipped ? `仕入先未設定の${r.skipped}品目は対象外です` : "仕入先ごとにまとめています", action: { label: "購買を開く", onClick: () => goTab("purchase") } });
                  else toast.error("購買依頼を作成できる品目がありません", { description: "仕入先が設定された未手配の購入品が対象です" });
                }}
              >
                購買依頼を作成（{stats.pending - stats.noSupplier}）
              </Button>
            )}
          </div>
        </div>
        <datalist id="bom-parts">
          {parts.map((p) => (
            <option key={p.id} value={p.partNo}>
              {p.name} {p.spec}
            </option>
          ))}
        </datalist>
        <div className="scroll-thin max-h-[640px] overflow-auto">
          <table className="tbl tbl-compact" style={{ width: 1600, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className="w-[92px]">No.</th>
                <th className="w-[112px]">品番</th>
                <th className="w-[220px]">品名</th>
                <th className="w-[180px]">型式・仕様</th>
                <th className="w-[110px]">メーカー</th>
                <th className="w-[70px] text-right">数量</th>
                <th className="w-[50px]">単位</th>
                <th className="w-[104px] text-right">単価</th>
                <th className="w-[110px] text-right">金額</th>
                <th className="w-[80px]">手配</th>
                <th className="w-[150px]">仕入先</th>
                <th className="w-[78px] text-right">LT</th>
                <th className="w-[150px]">状態</th>
                <th className="w-[112px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item: b, depth, no, hasChildren }) => {
                const po = b.poId ? pos.find((p) => p.id === b.poId) : undefined;
                const locked = !!po && po.status !== "requested";
                const ro = !canEdit;
                const isAssy = hasChildren || (depth === 0 && b.procurement === "make" && b.unitCost === 0);
                return (
                  <tr key={b.id} className={cn("group", depth === 0 && "bg-stone-50/80", hasChildren && "font-medium")}>
                    <td>
                      <div className="flex items-center" style={{ paddingLeft: depth * 14 }}>
                        {hasChildren ? (
                          <button
                            onClick={() => {
                              const n = new Set(collapsed);
                              if (n.has(b.id)) n.delete(b.id);
                              else n.add(b.id);
                              setCollapsed(n);
                            }}
                            className="mr-0.5 rounded-sm p-0.5 text-stone-500 hover:bg-stone-200"
                          >
                            {collapsed.has(b.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                          </button>
                        ) : (
                          <span className="mr-0.5 inline-block w-[17px]" />
                        )}
                        <span className="font-num text-[0.6875rem] text-stone-500">{no}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        className="cell-input font-num text-xs"
                        list="bom-parts"
                        value={b.partNo}
                        disabled={ro || locked}
                        onChange={(e) => updateItem(c.id, b.id, { partNo: e.target.value })}
                        onBlur={(e) => onPartNo(b, e.target.value)}
                        placeholder={isAssy ? "" : "品番"}
                      />
                    </td>
                    <td>
                      <input className={cn("cell-input", depth === 0 && "font-bold text-ai-900")} value={b.name} disabled={ro} onChange={(e) => updateItem(c.id, b.id, { name: e.target.value })} placeholder="品名" />
                      {b.note && <div className="px-1.5 text-[0.625rem] text-amber-700">{b.note}</div>}
                    </td>
                    <td>
                      <input className="cell-input text-xs text-stone-600" value={b.spec} disabled={ro} onChange={(e) => updateItem(c.id, b.id, { spec: e.target.value })} />
                    </td>
                    <td>
                      <input className="cell-input text-xs" value={b.maker} disabled={ro} onChange={(e) => updateItem(c.id, b.id, { maker: e.target.value })} />
                    </td>
                    <td>
                      <NumberInput compact value={b.qty} onChange={(v) => updateItem(c.id, b.id, { qty: v })} disabled={ro || locked} min={0} />
                    </td>
                    <td>
                      <input className="cell-input text-xs" value={b.unit} disabled={ro} onChange={(e) => updateItem(c.id, b.id, { unit: e.target.value })} />
                    </td>
                    <td>
                      {hasChildren ? (
                        <span className="block px-1.5 text-right text-[0.6875rem] text-stone-400">（集計）</span>
                      ) : showCost ? (
                        <NumberInput compact value={b.unitCost} onChange={(v) => updateItem(c.id, b.id, { unitCost: v })} disabled={ro || locked} min={0} />
                      ) : (
                        <span className="block text-right text-stone-300">＊＊＊</span>
                      )}
                    </td>
                    <td className={cn("font-num text-right text-xs", hasChildren && "font-bold")}>{showCost ? yen(bomRollup(c.bom, b.id)) : "＊＊＊"}</td>
                    <td>
                      {hasChildren ? (
                        <span className="px-1 text-[0.6875rem] text-stone-400">—</span>
                      ) : (
                        <select className="cell-input text-xs" value={b.procurement} disabled={ro || locked} onChange={(e) => updateItem(c.id, b.id, { procurement: e.target.value as Procurement })}>
                          {(Object.keys(PROCUREMENT) as Procurement[]).map((p) => (
                            <option key={p} value={p}>
                              {PROCUREMENT[p].label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {!hasChildren && b.procurement === "buy" ? (
                        <select className={cn("cell-input text-xs", !b.supplierId && "text-amber-700")} value={b.supplierId ?? ""} disabled={ro || locked} onChange={(e) => updateItem(c.id, b.id, { supplierId: e.target.value || undefined })}>
                          <option value="">（未設定）</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name.replace(/株式会社|有限会社/g, "")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-1.5 text-[0.6875rem] text-stone-400">{hasChildren ? "" : b.procurement === "make" ? "社内製作" : "客先支給"}</span>
                      )}
                    </td>
                    <td>{!hasChildren && <NumberInput compact value={b.leadTimeDays ?? 0} onChange={(v) => updateItem(c.id, b.id, { leadTimeDays: v })} disabled={ro || locked} min={0} suffix="日" />}</td>
                    <td>
                      {po ? (
                        <span className="flex items-center gap-1">
                          {locked && <Lock size={10} className="text-stone-400" />}
                          <Badge className={PO_STATUS[po.status].color}>{PO_STATUS[po.status].label}</Badge>
                          <span className="font-num text-[0.625rem] text-stone-400">{po.poNo}</span>
                        </span>
                      ) : !hasChildren && b.procurement === "buy" ? (
                        <Badge className="bg-amber-50 text-amber-800 ring-amber-200">未手配</Badge>
                      ) : !hasChildren ? (
                        <Badge className={PROCUREMENT[b.procurement].color}>{PROCUREMENT[b.procurement].label}</Badge>
                      ) : null}
                    </td>
                    <td>
                      {canEdit && (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <IconButton label="子部品を追加" className="h-6 w-6" onClick={() => { addItem(c.id, {}, b.id); setCollapsed((s) => { const n = new Set(s); n.delete(b.id); return n; }); }}>
                            <Plus size={13} />
                          </IconButton>
                          <IconButton label="上へ" className="h-6 w-6" onClick={() => moveItem(c.id, b.id, -1)}>
                            <ArrowUp size={13} />
                          </IconButton>
                          <IconButton label="下へ" className="h-6 w-6" onClick={() => moveItem(c.id, b.id, 1)}>
                            <ArrowDown size={13} />
                          </IconButton>
                          {depth === 0 && hasChildren && (
                            <IconButton label="標準モジュールとして登録" className="h-6 w-6" onClick={() => setTplRoot(b.id)}>
                              <BookmarkPlus size={13} />
                            </IconButton>
                          )}
                          <IconButton label="削除" className="h-6 w-6 hover:text-rose-600" disabled={locked} onClick={() => setDelTarget(b)}>
                            <Trash2 size={13} />
                          </IconButton>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {showCost && (
              <tfoot>
                <tr className="bg-ai-50 font-bold">
                  <td colSpan={8} className="px-3 py-2 text-right text-xs">合計（1台あたり）</td>
                  <td className="font-num px-3 py-2 text-right text-[0.8125rem]">{yen(bomTotal(c.bom))}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-2 text-[0.6875rem] text-stone-500">
          💡 品番セルに品目マスタの品番を入力すると、品名・型式・単価・仕入先・リードタイムが自動で補完されます。発注済み（🔒）の行は数量・単価を変更できません。
        </div>
      </Card>

      <BomModals c={c} modal={modal} setModal={setModal} />
      <SaveTemplateModal c={c} rootId={tplRoot} onClose={() => setTplRoot(null)} />
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => {
          if (delTarget) {
            deleteItem(c.id, delTarget.id);
            toast.success("削除しました");
          }
        }}
        title="BOM行の削除"
        message={<>「{delTarget?.name || "（名称未設定）"}」{delTarget && c.bom.some((x) => x.parentId === delTarget.id) ? "と配下の部品すべて" : ""}を削除します。よろしいですか？</>}
        confirmLabel="削除する"
        danger
      />
    </div>
  );
}

function BomModals({ c, modal, setModal }: { c: Case; modal: null | "copy" | "tpl" | "parts" | "import"; setModal: (m: null) => void }) {
  return (
    <>
      <CopyFromCaseModal c={c} open={modal === "copy"} onClose={() => setModal(null)} />
      <TemplateModal c={c} open={modal === "tpl"} onClose={() => setModal(null)} />
      <PartPickerModal c={c} open={modal === "parts"} onClose={() => setModal(null)} />
      <ImportModal c={c} open={modal === "import"} onClose={() => setModal(null)} />
    </>
  );
}
