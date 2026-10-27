"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { fmtDateJa, num, today } from "@/lib/format";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { PrintShell, StampBoxes } from "@/components/print/print-shell";

export default function SpecPrintPage() {
  const { id } = useParams<{ id: string }>();
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const st = useStore((s) => s.settings);
  const lk = useLookups();
  if (!c) return <div className="p-10 text-center text-sm">案件が見つかりません</div>;
  const cust = lk.customer.get(c.customerId);
  const site = lk.site.get(c.siteId);
  const s = c.specs;
  const eng = c.engineerId ? lk.user.get(c.engineerId) : undefined;

  const Section = ({ no, title, children }: { no: number; title: string; children: React.ReactNode }) => (
    <section className="mt-5">
      <h2 className="mb-1.5 border-l-4 border-stone-800 pl-2 text-[0.8125rem] font-bold">
        {no}．{title}
      </h2>
      {children}
    </section>
  );

  return (
    <PrintShell title={`仕様書 ${c.workNo ?? c.dealNo}`}>
      <div className="flex items-start justify-between">
        <div className="text-[0.6875rem] leading-[1.8]">
          <div>取引番号：<span className="font-num">{c.dealNo}</span></div>
          {c.workNo && <div>工事番号：<span className="font-num font-bold">{c.workNo}</span></div>}
          <div>作成日：{fmtDateJa(today())}</div>
        </div>
        <StampBoxes labels={["承認", "確認", "作成"]} users={lk.user} />
      </div>
      <h1 className="font-mincho mt-4 text-center text-[1.5rem] font-bold tracking-[0.6em]">仕 様 書</h1>
      <div className="mt-1 text-center text-[0.875rem] font-bold">{c.title}</div>
      <table className="mx-auto mt-4 w-[150mm] border-collapse text-[0.6875rem]">
        <tbody>
          {[
            ["お客様", `${cust?.name ?? ""} 御中`],
            ["納入場所", `${site?.name ?? ""}（${site?.address ?? ""}）`],
            ["装置種別", EQUIPMENT_TYPES[c.equipmentType].label],
            ["作成", `${st.companyName}　${eng ? `${eng.dept} ${eng.name}` : ""}`],
          ].map(([k, v]) => (
            <tr key={k}>
              <th className="w-28 border border-stone-500 bg-stone-100 px-2 py-1 text-left font-normal">{k}</th>
              <td className="border border-stone-500 px-2 py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Section no={1} title="概要">
        <p className="whitespace-pre-wrap px-2 text-[0.6875rem]">{c.description || "—"}</p>
      </Section>
      <Section no={2} title="基本仕様">
        <table className="w-full border-collapse text-[0.6875rem]">
          <tbody>
            {[
              ["処理能力", `${num(s.capacity)} ${s.capacityUnit}`],
              ["外形寸法", `W${num(s.width)} × D${num(s.depth)} × H${num(s.height)} mm（概略）`],
              ["対象ワーク", s.workpiece || "—"],
              ["主要材質", s.material],
              ["制御方式", s.control],
              ["電源", s.power],
              ["設置環境", s.environment],
            ].map(([k, v]) => (
              <tr key={k}>
                <th className="w-36 border border-stone-400 bg-stone-50 px-2 py-1.5 text-left font-normal">{k}</th>
                <td className="border border-stone-400 px-2 py-1.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section no={3} title="個別仕様">
        {s.customFields.length === 0 ? (
          <p className="px-2 text-[0.6875rem]">特になし</p>
        ) : (
          <table className="w-full border-collapse text-[0.6875rem]">
            <tbody>
              {s.customFields.map((f, i) => (
                <tr key={i}>
                  <th className="w-36 border border-stone-400 bg-stone-50 px-2 py-1.5 text-left font-normal">{f.label}</th>
                  <td className="border border-stone-400 px-2 py-1.5">{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
      <Section no={4} title="オプション・付帯工事">
        <ul className="list-inside list-disc px-2 text-[0.6875rem]">
          {s.options.length ? s.options.map((o) => <li key={o}>{o}</li>) : <li>なし</li>}
        </ul>
      </Section>
      <Section no={5} title="特記事項">
        <div className="min-h-[18mm] whitespace-pre-wrap border border-stone-400 px-3 py-2 text-[0.6875rem]">
          {s.notes || "・本仕様書に記載のない事項は、別途協議のうえ決定するものとします。\n・電源・エア・給排水の一次側配管は貴社ご支給とさせていただきます。"}
        </div>
      </Section>
      <div className="mt-8 text-right text-[0.5625rem] text-stone-400">{st.companyName}／匠帳より出力</div>
    </PrintShell>
  );
}
