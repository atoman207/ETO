"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { can, useCurrentUser, useLookups } from "@/lib/hooks";
import { bomChildren, bomRollup, fmtDate, fmtDateJa, num, today } from "@/lib/format";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { PrintShell, StampBoxes } from "@/components/print/print-shell";

export default function OrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const quotes = useStore((s) => s.quotes);
  const st = useStore((s) => s.settings);
  const me = useCurrentUser();
  const lk = useLookups();
  if (!c || !c.workNo || !c.order) return <div className="p-10 text-center text-sm">工事番号が発行された案件が見つかりません</div>;
  const cust = lk.customer.get(c.customerId);
  const q = quotes.find((x) => x.caseId === c.id && x.status === "accepted");
  const showCost = can(me, "viewCost");
  const roots = bomChildren(c.bom, null);
  const pinned = c.notes.filter((n) => n.pinned);
  const member = (uid?: string) => (uid ? lk.user.get(uid)?.name ?? "—" : "未定");

  return (
    <PrintShell title={`社内注文書 ${c.workNo}`}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] leading-[1.8]">
          <div>発行日：{fmtDateJa(c.workNoIssuedAt?.slice(0, 10) ?? today())}</div>
          <div>取引番号：<span className="font-num">{c.dealNo}</span></div>
          <div>見積番号：<span className="font-num">{q?.quoteNo ?? "—"}</span></div>
        </div>
        <StampBoxes labels={["営業部長", "設計", "購買", "製造", "品証"]} users={lk.user} />
      </div>
      <h1 className="font-mincho mt-4 text-center text-[24px] font-bold tracking-[0.4em]">社内注文書<span className="ml-2 text-[14px] tracking-normal">（工事指示書）</span></h1>
      <div className="mx-auto mt-4 flex w-fit items-center gap-4 border-[3px] border-stone-800 px-6 py-2">
        <span className="text-[12px]">工事番号</span>
        <span className="font-num text-[28px] font-bold tracking-wider">{c.workNo}</span>
      </div>

      <table className="mt-5 w-full border-collapse text-[11px]">
        <tbody>
          {[
            ["件名", c.title, "装置種別", EQUIPMENT_TYPES[c.equipmentType].label],
            ["お客様", cust?.name ?? "", "客先注文番号", c.order.customerPoNo],
            ["受注日", fmtDate(c.order.orderDate), "納期", fmtDate(c.order.deliveryDate)],
            ["受注金額（税抜）", showCost || can(me, "editCase") ? `¥${c.order.orderAmount.toLocaleString()}` : "＊＊＊", "台数", `${c.order.quantity} 台`],
            ["納入場所", c.order.deliveryPlace, "支払条件", c.order.paymentTerms],
            ["営業担当", member(c.salesRepId), "設計担当", member(c.engineerId)],
          ].map((r, i) => (
            <tr key={i}>
              <th className="w-28 border border-stone-500 bg-stone-100 px-2 py-1.5 text-left font-normal">{r[0]}</th>
              <td className="border border-stone-500 px-2 py-1.5">{r[1]}</td>
              <th className="w-28 border border-stone-500 bg-stone-100 px-2 py-1.5 text-left font-normal">{r[2]}</th>
              <td className="border border-stone-500 px-2 py-1.5">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-5 mb-1.5 border-l-4 border-stone-800 pl-2 text-[13px] font-bold">仕様概要</h2>
      <div className="border border-stone-400 px-3 py-2 text-[11px] leading-[1.8]">
        処理能力 {num(c.specs.capacity)}{c.specs.capacityUnit}／W{num(c.specs.width)}×D{num(c.specs.depth)}×H{num(c.specs.height)}mm／{c.specs.material}／{c.specs.control}／{c.specs.power}／{c.specs.environment}
        <br />
        対象ワーク：{c.specs.workpiece || "—"}
        {c.specs.customFields.length > 0 && (
          <>
            <br />
            {c.specs.customFields.map((f) => `${f.label}：${f.value}`).join("／")}
          </>
        )}
        {c.specs.options.length > 0 && (
          <>
            <br />
            オプション：{c.specs.options.join("、")}
          </>
        )}
      </div>

      <h2 className="mt-5 mb-1.5 border-l-4 border-stone-800 pl-2 text-[13px] font-bold">工程計画</h2>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-stone-100">
            <th className="border border-stone-500 py-1">工程</th>
            <th className="border border-stone-500 py-1">開始</th>
            <th className="border border-stone-500 py-1">完了予定</th>
            <th className="border border-stone-500 py-1">担当</th>
            <th className="w-20 border border-stone-500 py-1">確認</th>
          </tr>
        </thead>
        <tbody>
          {c.processes.map((p) => (
            <tr key={p.id}>
              <td className="border border-stone-400 px-2 py-1">{p.name}</td>
              <td className="font-num border border-stone-400 px-2 text-center">{fmtDate(p.startDate, false)}</td>
              <td className="font-num border border-stone-400 px-2 text-center">{fmtDate(p.endDate, false)}</td>
              <td className="border border-stone-400 px-2 text-center">{member(p.assigneeId)}</td>
              <td className="border border-stone-400" />
            </tr>
          ))}
        </tbody>
      </table>

      {roots.length > 0 && (
        <>
          <h2 className="mt-5 mb-1.5 border-l-4 border-stone-800 pl-2 text-[13px] font-bold">ユニット構成（BOM概要）</h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-stone-100">
                <th className="w-8 border border-stone-500 py-1">No.</th>
                <th className="border border-stone-500 py-1">ユニット</th>
                <th className="w-20 border border-stone-500 py-1">品目数</th>
                {showCost && <th className="w-28 border border-stone-500 py-1">予算（BOM）</th>}
              </tr>
            </thead>
            <tbody>
              {roots.map((r, i) => (
                <tr key={r.id}>
                  <td className="border border-stone-400 text-center">{i + 1}</td>
                  <td className="border border-stone-400 px-2 py-1">{r.name}</td>
                  <td className="font-num border border-stone-400 px-2 text-right">{bomChildren(c.bom, r.id).length}</td>
                  {showCost && <td className="font-num border border-stone-400 px-2 text-right">¥{bomRollup(c.bom, r.id).toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="mt-5 mb-1.5 border-l-4 border-stone-800 pl-2 text-[13px] font-bold">特記事項・申し送り</h2>
      <div className="min-h-[20mm] border border-stone-400 px-3 py-2 text-[11px] leading-[1.8]">
        {pinned.length ? pinned.map((n) => <div key={n.id}>・{n.text}</div>) : "特になし"}
      </div>
      <div className="mt-6 text-right text-[9px] text-stone-400">{st.companyName}／匠帳より出力</div>
    </PrintShell>
  );
}
