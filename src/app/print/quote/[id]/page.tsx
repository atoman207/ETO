"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { fmtDateJa, quoteSubtotal } from "@/lib/format";
import { PrintShell, CompanySeal, StampBoxes } from "@/components/print/print-shell";

const n = (v: number) => v.toLocaleString("ja-JP");

export default function QuotePrintPage() {
  const { id } = useParams<{ id: string }>();
  const q = useStore((s) => s.quotes.find((x) => x.id === id));
  const st = useStore((s) => s.settings);
  const lk = useLookups();
  if (!q) return <div className="p-10 text-center text-sm">見積書が見つかりません</div>;
  const c = lk.case.get(q.caseId);
  const cust = c ? lk.customer.get(c.customerId) : undefined;
  const site = c ? lk.site.get(c.siteId) : undefined;
  const contact = site?.contacts[0];
  const rep = c ? lk.user.get(c.salesRepId) : undefined;
  const subtotal = quoteSubtotal(q);
  const gross = subtotal + (q.discount || 0);
  const tax = Math.floor(subtotal * st.taxRate);
  const rows = [...q.items];
  const filler = Math.max(0, 12 - rows.length - (q.discount ? 1 : 0));

  return (
    <PrintShell title={`御見積書 ${q.quoteNo}`}>
      <div className="flex justify-between text-[0.6875rem]">
        <div />
        <table className="text-right">
          <tbody>
            <tr><td className="pr-3 text-stone-600">見積番号</td><td className="font-num font-medium">{q.quoteNo}</td></tr>
            <tr><td className="pr-3 text-stone-600">見積日</td><td>{fmtDateJa(q.issueDate)}</td></tr>
          </tbody>
        </table>
      </div>
      <h1 className="font-mincho mx-auto mt-2 w-fit border-b-[3px] border-double border-stone-800 px-10 pb-1 text-center text-[1.625rem] font-bold tracking-[0.8em]">御見積書</h1>

      <div className="mt-8 grid grid-cols-[1fr_76mm] gap-6">
        <div>
          <div className="border-b border-stone-800 pb-1 text-[1.0625rem] font-bold">
            {cust?.name}　<span className="text-[0.9375rem]">御中</span>
          </div>
          {contact && <div className="mt-1 text-[0.6875rem]">{contact.dept}　{contact.name} 様</div>}
          <p className="mt-3 text-[0.6875rem]">下記の通り御見積申し上げます。何卒ご用命賜りますようお願い申し上げます。</p>
          <table className="mt-3 w-full border-collapse text-[0.6875rem]">
            <tbody>
              {[
                ["件　　名", q.subject],
                ["納　　期", q.deliveryTerms],
                ["受渡場所", q.deliveryPlace],
                ["支払条件", q.paymentTerms],
                ["有効期限", `${fmtDateJa(q.validUntil)}`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className="w-20 border-b border-stone-300 py-1 text-left font-normal text-stone-600">{k}</th>
                  <td className="border-b border-stone-300 py-1">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-end border-2 border-stone-800">
            <div className="bg-stone-800 px-3 py-2.5 text-[0.75rem] font-bold text-white">御見積金額<br /><span className="text-[0.625rem] font-normal">（消費税込）</span></div>
            <div className="font-num flex-1 px-4 py-2 text-right text-[1.5rem] font-bold tracking-wide">¥{n(subtotal + tax)}－</div>
          </div>
          <div className="font-num mt-1 text-right text-[0.625rem] text-stone-600">（税抜金額 ¥{n(subtotal)}　消費税 ¥{n(tax)}）</div>
        </div>
        <div className="relative pt-1 text-[0.6875rem] leading-[1.7]">
          <div className="text-[0.875rem] font-bold">{st.companyName}</div>
          <div>〒{st.postalCode}</div>
          <div>{st.address}</div>
          <div>TEL {st.phone}　FAX {st.fax}</div>
          <div className="text-[0.625rem]">登録番号：{st.invoiceNo}</div>
          <div className="mt-1">担当：{rep?.dept} {rep?.name}</div>
          <div className="absolute right-0 top-0">
            <div className="relative h-[70px] w-[70px]">
              <CompanySeal name={st.companyName} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <StampBoxes steps={q.approvals} users={lk.user} />
          </div>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-[0.6875rem]">
        <thead>
          <tr className="bg-stone-100">
            <th className="w-8 border border-stone-500 py-1">No.</th>
            <th className="border border-stone-500 py-1">品名・仕様</th>
            <th className="w-14 border border-stone-500 py-1">数量</th>
            <th className="w-10 border border-stone-500 py-1">単位</th>
            <th className="w-24 border border-stone-500 py-1">単価</th>
            <th className="w-28 border border-stone-500 py-1">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            <tr key={it.id}>
              <td className="border border-stone-400 py-1 text-center">{i + 1}</td>
              <td className="border border-stone-400 px-2 py-1">
                <div className="font-medium">{it.name}</div>
                {it.spec && <div className="text-[0.625rem] text-stone-600">{it.spec}</div>}
              </td>
              <td className="font-num border border-stone-400 px-2 text-right">{n(it.qty)}</td>
              <td className="border border-stone-400 text-center">{it.unit}</td>
              <td className="font-num border border-stone-400 px-2 text-right">{n(it.unitPrice)}</td>
              <td className="font-num border border-stone-400 px-2 text-right">{n(it.qty * it.unitPrice)}</td>
            </tr>
          ))}
          {q.discount > 0 && (
            <tr>
              <td className="border border-stone-400 py-1 text-center">{rows.length + 1}</td>
              <td className="border border-stone-400 px-2 py-1 font-medium">出精値引き</td>
              <td className="border border-stone-400" />
              <td className="border border-stone-400 text-center">式</td>
              <td className="border border-stone-400" />
              <td className="font-num border border-stone-400 px-2 text-right">△{n(q.discount)}</td>
            </tr>
          )}
          {Array.from({ length: filler }).map((_, i) => (
            <tr key={`f${i}`}>
              {Array.from({ length: 6 }).map((__, j) => <td key={j} className="h-[7mm] border border-stone-300" />)}
            </tr>
          ))}
          <tr>
            <td colSpan={4} rowSpan={4} className="border border-stone-400 align-top text-[0.625rem] text-stone-600" />
            <td className="border border-stone-500 bg-stone-50 px-2 py-1 text-center">小　計</td>
            <td className="font-num border border-stone-500 px-2 text-right">{n(gross)}</td>
          </tr>
          <tr>
            <td className="border border-stone-500 bg-stone-50 px-2 py-1 text-center">値　引</td>
            <td className="font-num border border-stone-500 px-2 text-right">{q.discount ? `△${n(q.discount)}` : "0"}</td>
          </tr>
          <tr>
            <td className="border border-stone-500 bg-stone-50 px-2 py-1 text-center">消費税（{Math.round(st.taxRate * 100)}%）</td>
            <td className="font-num border border-stone-500 px-2 text-right">{n(tax)}</td>
          </tr>
          <tr>
            <td className="border-2 border-stone-800 bg-stone-100 px-2 py-1 text-center font-bold">合　計</td>
            <td className="font-num border-2 border-stone-800 px-2 text-right font-bold">{n(subtotal + tax)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 border border-stone-500">
        <div className="border-b border-stone-500 bg-stone-100 px-2 py-0.5 text-[0.6875rem] font-bold">備　考</div>
        <div className="min-h-[22mm] whitespace-pre-wrap px-3 py-2 text-[0.6875rem]">{q.notes}</div>
      </div>
      <div className="mt-6 text-right text-[0.5625rem] text-stone-400">
        {c?.dealNo}　本書は{st.companyName}の業務システム「匠帳」により出力されました
      </div>
    </PrintShell>
  );
}
